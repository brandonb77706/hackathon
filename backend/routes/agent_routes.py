"""
Layer 2 — Base44 AI agent endpoints.
All routes protected by AGENT_API_KEY header.
"""
from fastapi import APIRouter, Header, HTTPException
from datetime import datetime, timezone, timedelta
from bson import ObjectId

from auth import verify_agent_key
from database import get_db
from models import AgentDriverSummary, SaveInsightRequest, InsightResponse
from analytics import get_peak_times, PERSONAL_SHIFT_THRESHOLD

router = APIRouter(prefix="/agent", tags=["agent"])


@router.get("/driver-summary")
async def driver_summary(
    user_id: str,
    x_agent_api_key: str = Header(...),
):
    """
    Structured JSON for the Base44 agent to reason over.
    Includes peak windows, earnings trend, platform and day comparisons,
    and recent shift summaries.
    """
    verify_agent_key(x_agent_api_key)
    db = get_db()

    # Fetch user for city
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    city = user.get("city") or "Unknown"
    all_shifts = []
    async for s in db.shifts.find({"user_id": user_id}).sort("start_time", -1):
        all_shifts.append(s)

    shift_count = len(all_shifts)
    data_source = "personal" if shift_count >= PERSONAL_SHIFT_THRESHOLD else "community"

    # ── Top 5 peak windows ────────────────────────────────────────────────────
    peak = await get_peak_times(db, user_id, city)
    top_windows = [w.model_dump() for w in peak.windows]

    # ── Earnings trend: last 4 weeks ──────────────────────────────────────────
    now = datetime.now(timezone.utc)
    trend = []
    for week_offset in range(4):
        week_end = now - timedelta(weeks=week_offset)
        week_start = week_end - timedelta(weeks=1)
        week_shifts = [
            s for s in all_shifts
            if _aware(s["start_time"]) >= week_start and _aware(s["start_time"]) < week_end
        ]
        total = sum(s["earnings"] + s.get("tips", 0) for s in week_shifts)
        hours = sum(s.get("hours_worked", 0) for s in week_shifts)
        trend.append({
            "week": f"Week -{week_offset}" if week_offset else "This week",
            "total_earnings": round(total, 2),
            "hours_worked": round(hours, 2),
            "avg_eph": round(total / hours, 2) if hours > 0 else 0,
            "shift_count": len(week_shifts),
        })

    # ── Platform comparison ───────────────────────────────────────────────────
    platform_stats: dict[str, dict] = {}
    for s in all_shifts:
        p = s["platform"]
        if p not in platform_stats:
            platform_stats[p] = {"total": 0.0, "count": 0}
        platform_stats[p]["total"] += s["earnings_per_hour"]
        platform_stats[p]["count"] += 1

    platform_avg = {
        p: round(v["total"] / v["count"], 2)
        for p, v in platform_stats.items()
        if v["count"] > 0
    }

    best_platform = max(platform_avg, key=platform_avg.get) if platform_avg else None
    worst_platform = min(platform_avg, key=platform_avg.get) if platform_avg else None

    # ── Day of week comparison ────────────────────────────────────────────────
    day_stats: dict[int, dict] = {}
    for s in all_shifts:
        d = s["day_of_week"]
        if d not in day_stats:
            day_stats[d] = {"total": 0.0, "count": 0}
        day_stats[d]["total"] += s["earnings_per_hour"]
        day_stats[d]["count"] += 1

    day_avg = {
        d: round(v["total"] / v["count"], 2)
        for d, v in day_stats.items()
        if v["count"] > 0
    }
    best_day = max(day_avg, key=day_avg.get) if day_avg else None
    worst_day = min(day_avg, key=day_avg.get) if day_avg else None

    # ── Recent 10 shifts ──────────────────────────────────────────────────────
    recent = []
    for s in all_shifts[:10]:
        recent.append({
            "date": s["start_time"].strftime("%Y-%m-%d"),
            "platform": s["platform"],
            "hours_worked": s.get("hours_worked", 0),
            "total_pay": round(s["earnings"] + s.get("tips", 0), 2),
            "earnings_per_hour": s["earnings_per_hour"],
        })

    return {
        "user_id": user_id,
        "city": city,
        "shift_count": shift_count,
        "data_source": data_source,
        "top_peak_windows": top_windows,
        "earnings_trend_4_weeks": trend,
        "best_platform": best_platform,
        "worst_platform": worst_platform,
        "best_day_of_week": best_day,
        "worst_day_of_week": worst_day,
        "recent_10_shifts": recent,
        "platform_avg_eph": platform_avg,
        "day_avg_eph": {str(k): v for k, v in day_avg.items()},
    }


@router.post("/save-insight")
async def save_insight(
    payload: SaveInsightRequest,
    x_agent_api_key: str = Header(...),
):
    """Base44 agent calls this to persist a generated insight."""
    verify_agent_key(x_agent_api_key)
    db = get_db()

    doc = {
        "user_id": payload.user_id,
        "generated_at": datetime.now(timezone.utc),
        "insight_text": payload.insight_text,
        "top_suggestion": payload.top_suggestion,
        "data_snapshot": payload.data_snapshot,
    }
    result = await db.agent_insights.insert_one(doc)
    return {"id": str(result.inserted_id), "status": "saved"}


@router.get("/latest-insight", response_model=InsightResponse | None)
async def latest_insight(user_id: str, x_agent_api_key: str = Header(...)):
    """Return the most recent saved insight for a user."""
    verify_agent_key(x_agent_api_key)
    db = get_db()

    doc = await db.agent_insights.find_one(
        {"user_id": user_id}, sort=[("generated_at", -1)]
    )
    if not doc:
        return None

    return InsightResponse(
        id=str(doc["_id"]),
        user_id=doc["user_id"],
        generated_at=doc["generated_at"],
        insight_text=doc["insight_text"],
        top_suggestion=doc["top_suggestion"],
    )


def _aware(dt: datetime) -> datetime:
    """Ensure a datetime is timezone-aware (assume UTC if naive)."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt
