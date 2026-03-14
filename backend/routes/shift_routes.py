"""
Shift logging endpoints.
earnings_per_hour, day_of_week, and hour_of_day are auto-derived on write.
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from bson import ObjectId

from auth import get_current_user
from database import get_db
from models import ShiftCreate, ShiftResponse

router = APIRouter(prefix="/shifts", tags=["shifts"])

# Track shifts logged since last peak_cache rebuild
_shifts_since_rebuild = 0
REBUILD_INTERVAL = 50  # rebuild peak_cache every 50 new shifts


@router.post("", response_model=ShiftResponse)
async def log_shift(
    payload: ShiftCreate,
    current_user: dict = Depends(get_current_user),
):
    global _shifts_since_rebuild
    db = get_db()

    hours_worked = (
        payload.end_time - payload.start_time
    ).total_seconds() / 3600

    if hours_worked <= 0:
        raise HTTPException(status_code=400, detail="end_time must be after start_time")

    # Auto-calculate earnings_per_hour
    earnings_per_hour = (payload.earnings + payload.tips) / hours_worked

    # Derive day_of_week (0=Monday) and hour_of_day from start_time
    start_local = payload.start_time
    day_of_week = start_local.weekday()   # 0=Monday, 6=Sunday
    hour_of_day = start_local.hour

    doc = {
        "user_id": current_user["user_id"],
        "platform": payload.platform,
        "start_time": payload.start_time,
        "end_time": payload.end_time,
        "earnings": payload.earnings,
        "tips": payload.tips,
        "city": payload.city,
        "day_of_week": day_of_week,
        "hour_of_day": hour_of_day,
        "earnings_per_hour": round(earnings_per_hour, 2),
        "hours_worked": round(hours_worked, 2),
        "created_at": datetime.now(timezone.utc),
    }

    result = await db.shifts.insert_one(doc)
    _shifts_since_rebuild += 1

    # Trigger peak_cache rebuild every REBUILD_INTERVAL shifts
    if _shifts_since_rebuild >= REBUILD_INTERVAL:
        from analytics import rebuild_peak_cache
        await rebuild_peak_cache(db)
        _shifts_since_rebuild = 0

    return ShiftResponse(
        id=str(result.inserted_id),
        **{k: doc[k] for k in doc if k != "_id"},
    )


@router.get("", response_model=list[ShiftResponse])
async def get_shifts(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    # Users can only fetch their own shifts
    if current_user["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    db = get_db()
    cursor = db.shifts.find({"user_id": user_id}).sort("start_time", -1)
    shifts = []
    async for doc in cursor:
        shifts.append(
            ShiftResponse(
                id=str(doc["_id"]),
                **{k: doc[k] for k in doc if k not in ("_id",)},
            )
        )
    return shifts
