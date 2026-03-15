"""
Layer 1 — Math-based peak time analytics.

Key logic:
- Users with 5+ shifts: use their personal shift data
- Users with <5 shifts: fall back to peak_cache (community data for their city)
- Peak windows = top 10 (day_of_week, hour_of_day) combos ranked by avg $/hr
- peak_cache is rebuilt on startup and every 50 new shifts
"""
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from models import PeakWindow, PeakTimesResponse, EarningsSummary

PERSONAL_SHIFT_THRESHOLD = 5  # min shifts to use personal data


async def get_peak_times(
    db: AsyncIOMotorDatabase,
    user_id: str,
    city: str,
) -> PeakTimesResponse:
    """
    Return top 10 earning windows for a user.
    Source is 'personal' if they have 5+ shifts, else 'community'.
    """
    shift_count = await db.shifts.count_documents({"user_id": user_id})

    if shift_count >= PERSONAL_SHIFT_THRESHOLD:
        windows = await _personal_peak_windows(db, user_id)
        source = "personal"
    else:
        windows = await _community_peak_windows(db, city)
        source = "community"

    return PeakTimesResponse(
        windows=windows,
        data_source=source,
        shift_count=shift_count,
    )


async def _personal_peak_windows(
    db: AsyncIOMotorDatabase, user_id: str
) -> list[PeakWindow]:
    """
    Aggregate the user's own shifts grouped by (day_of_week, hour_of_day).
    Return top 5 by avg earnings_per_hour.
    """
    pipeline = [
        {"$match": {"user_id": user_id}},
        {
            "$group": {
                "_id": {"day": "$day_of_week", "hour": "$hour_of_day"},
                "avg_eph": {"$avg": "$earnings_per_hour"},
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"avg_eph": -1}},
        {"$limit": 10},
    ]
    results = []
    async for doc in db.shifts.aggregate(pipeline):
        results.append(
            PeakWindow(
                day_of_week=doc["_id"]["day"],
                hour_of_day=doc["_id"]["hour"],
                avg_earnings_per_hour=round(doc["avg_eph"], 2),
                sample_count=doc["count"],
                source="personal",
            )
        )
    return results


async def _community_peak_windows(
    db: AsyncIOMotorDatabase, city: str
) -> list[PeakWindow]:
    """
    Query peak_cache with 3-tier fallback:
      1. Exact city match  (e.g. "Toledo, OH")
      2. Same state        (e.g. any ", OH" city)
      3. National average  (all cities)
    """
    # Extract state abbreviation from "City, ST" format
    state = city.split(", ")[-1].strip() if ", " in city else None

    tiers = [
        ("city",     {"city": city}),
        ("state",    {"city": {"$regex": f", {state}$"}} if state else None),
        ("national", {}),
    ]

    for tier_name, match_filter in tiers:
        if match_filter is None:
            continue
        windows = await _run_community_pipeline(db, match_filter)
        if windows:
            return windows

    return []


async def _run_community_pipeline(
    db: AsyncIOMotorDatabase, match_filter: dict
) -> list[PeakWindow]:
    pipeline = [
        {"$match": match_filter},
        {
            "$group": {
                "_id": {"day": "$day_of_week", "hour": "$hour_of_day"},
                "total_weighted": {
                    "$sum": {"$multiply": ["$avg_earnings_per_hour", "$sample_count"]}
                },
                "total_samples": {"$sum": "$sample_count"},
            }
        },
        {
            "$project": {
                "avg_eph": {"$divide": ["$total_weighted", "$total_samples"]},
                "count": "$total_samples",
            }
        },
        {"$sort": {"avg_eph": -1}},
        {"$limit": 10},
    ]
    results = []
    async for doc in db.peak_cache.aggregate(pipeline):
        results.append(
            PeakWindow(
                day_of_week=doc["_id"]["day"],
                hour_of_day=doc["_id"]["hour"],
                avg_earnings_per_hour=round(doc["avg_eph"], 2),
                sample_count=doc["count"],
                source="community",
            )
        )
    return results


async def get_earnings_summary(
    db: AsyncIOMotorDatabase, user_id: str
) -> EarningsSummary:
    """Compute earnings summary stats for a user."""
    now = datetime.now(timezone.utc)
    # Week = last 7 days; month = last 30 days
    week_start = now - timedelta(days=7)
    month_start = now - timedelta(days=30)

    all_shifts = []
    async for s in db.shifts.find({"user_id": user_id}):
        all_shifts.append(s)

    if not all_shifts:
        return EarningsSummary(
            total_this_week=0,
            total_this_month=0,
            avg_per_hour_all_time=0,
            best_shift_date=None,
            best_shift_amount=None,
            hours_this_week=0,
            shift_count=0,
        )

    total_week = 0.0
    hours_week = 0.0
    total_month = 0.0
    total_earnings = 0.0
    total_hours = 0.0
    best_amount = 0.0
    best_date = None

    for s in all_shifts:
        total = s["earnings"] + s.get("tips", 0)
        hours = s.get("hours_worked", 0)
        start = s["start_time"]

        # Make timezone-aware for comparison
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)

        if start >= week_start:
            total_week += total
            hours_week += hours
        if start >= month_start:
            total_month += total

        total_earnings += total
        total_hours += hours

        if total > best_amount:
            best_amount = total
            best_date = start.strftime("%Y-%m-%d")

    avg_eph = round(total_earnings / total_hours, 2) if total_hours > 0 else 0

    return EarningsSummary(
        total_this_week=round(total_week, 2),
        total_this_month=round(total_month, 2),
        avg_per_hour_all_time=avg_eph,
        best_shift_date=best_date,
        best_shift_amount=round(best_amount, 2) if best_date else None,
        hours_this_week=round(hours_week, 2),
        shift_count=len(all_shifts),
    )


async def rebuild_peak_cache(db: AsyncIOMotorDatabase):
    """
    Recompute peak_cache by aggregating ALL shifts in the database,
    grouped by city + platform + day_of_week + hour_of_day.
    Called on startup and every 50 new shifts.
    """
    print("Rebuilding peak_cache...")
    pipeline = [
        {
            "$group": {
                "_id": {
                    "city": "$city",
                    "platform": "$platform",
                    "day_of_week": "$day_of_week",
                    "hour_of_day": "$hour_of_day",
                },
                "avg_earnings_per_hour": {"$avg": "$earnings_per_hour"},
                "sample_count": {"$sum": 1},
            }
        }
    ]

    async for doc in db.shifts.aggregate(pipeline):
        key = doc["_id"]
        await db.peak_cache.update_one(
            {
                "city": key["city"],
                "platform": key["platform"],
                "hour_of_day": key["hour_of_day"],
                "day_of_week": key["day_of_week"],
            },
            {
                "$set": {
                    "avg_earnings_per_hour": round(doc["avg_earnings_per_hour"], 2),
                    "sample_count": doc["sample_count"],
                    "last_updated": datetime.now(timezone.utc),
                }
            },
            upsert=True,
        )
    print("peak_cache rebuild complete.")
