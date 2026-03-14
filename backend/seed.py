"""
Seed 3 users + 30 shifts spread across realistic gig-worker peak hours.
Run: python seed.py
"""
import asyncio
from datetime import datetime, timezone, timedelta
import random
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from config import settings

# Realistic peak patterns (day_of_week, hour_of_day, eph_range)
PEAK_PATTERNS = [
    # Fri/Sat evenings 5-10pm
    (4, 17, (22, 28)), (4, 18, (23, 28)), (4, 19, (22, 27)),
    (4, 20, (21, 26)), (4, 21, (20, 25)),
    (5, 17, (24, 28)), (5, 18, (25, 28)), (5, 19, (23, 28)),
    (5, 20, (22, 27)), (5, 21, (21, 26)),
    # Lunch 11am-2pm
    (0, 11, (18, 23)), (0, 12, (19, 24)), (0, 13, (17, 22)),
    (1, 11, (17, 22)), (1, 12, (18, 23)), (2, 12, (18, 23)),
    (3, 11, (17, 21)), (3, 12, (18, 22)),
    # Sunday morning 9am-1pm
    (6, 9, (19, 24)), (6, 10, (20, 25)), (6, 11, (21, 26)),
    (6, 12, (20, 25)),
    # Slow times for contrast
    (0, 2, (12, 15)), (1, 3, (11, 14)), (2, 14, (13, 17)),
    (3, 15, (14, 18)), (6, 3, (10, 13)),
]

PLATFORMS = ["uber", "doordash", "lyft", "instacart", "other"]
CITY = "Toledo, OH"

SEED_USERS = [
    {"name": "Alex Rivera", "email": "alex@example.com", "oauth_sub": "google-seed-sub-001"},
    {"name": "Jordan Kim",  "email": "jordan@example.com","oauth_sub": "google-seed-sub-002"},
    {"name": "Taylor Moss", "email": "taylor@example.com","oauth_sub": "google-seed-sub-003"},
]


def make_shift(user_id: str, day_offset_weeks: int, pattern_idx: int):
    day_of_week, hour_of_day, eph_range = PEAK_PATTERNS[pattern_idx % len(PEAK_PATTERNS)]

    # Place the shift in the right past week
    now = datetime.now(timezone.utc)
    # Find the most recent day_of_week from the right week offset
    days_back = (now.weekday() - day_of_week) % 7 + (day_offset_weeks * 7)
    shift_date = now - timedelta(days=days_back)
    start = shift_date.replace(hour=hour_of_day, minute=random.randint(0, 30), second=0, microsecond=0)

    hours_worked = round(random.uniform(1.5, 4.5), 2)
    end = start + timedelta(hours=hours_worked)

    eph = random.uniform(*eph_range)
    total_pay = eph * hours_worked
    tips = round(total_pay * random.uniform(0.1, 0.25), 2)
    earnings = round(total_pay - tips, 2)

    return {
        "user_id": str(user_id),
        "platform": random.choice(PLATFORMS),
        "start_time": start,
        "end_time": end,
        "earnings": earnings,
        "tips": tips,
        "city": CITY,
        "day_of_week": day_of_week,
        "hour_of_day": hour_of_day,
        "earnings_per_hour": round(eph, 2),
        "hours_worked": hours_worked,
    }


async def seed():
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client.get_default_database()

    # Clear existing seed data
    await db.users.delete_many({"oauth_sub": {"$in": [u["oauth_sub"] for u in SEED_USERS]}})

    user_ids = []
    for u in SEED_USERS:
        result = await db.users.insert_one({
            "oauth_provider": "google",
            "oauth_sub": u["oauth_sub"],
            "email": u["email"],
            "name": u["name"],
            "city": CITY,
            "created_at": datetime.now(timezone.utc),
        })
        user_ids.append(result.inserted_id)
        print(f"Created user: {u['name']} -> {result.inserted_id}")

    # 10 shifts per user, spread across last 8 weeks
    for user_id in user_ids:
        # Clear old seed shifts for this user
        await db.shifts.delete_many({"user_id": str(user_id)})

        for i in range(10):
            week_offset = i % 8  # spread across 8 weeks
            shift = make_shift(user_id, week_offset, i)
            await db.shifts.insert_one(shift)

        print(f"Inserted 10 shifts for user {user_id}")

    # Rebuild peak_cache from seed data
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
    from datetime import datetime, timezone
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
    print("Seed complete.")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
