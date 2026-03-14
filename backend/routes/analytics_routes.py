from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_user
from database import get_db
from analytics import get_peak_times, get_earnings_summary, rebuild_peak_cache
from models import PeakTimesResponse, EarningsSummary

router = APIRouter(tags=["analytics"])


@router.get("/peak-times", response_model=PeakTimesResponse)
async def peak_times(
    user_id: str,
    city: str,
    current_user: dict = Depends(get_current_user),
):
    if current_user["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    db = get_db()
    return await get_peak_times(db, user_id, city)


@router.get("/earnings/summary", response_model=EarningsSummary)
async def earnings_summary(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    if current_user["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    db = get_db()
    return await get_earnings_summary(db, user_id)


@router.post("/peak-cache/update")
async def update_peak_cache(current_user: dict = Depends(get_current_user)):
    db = get_db()
    await rebuild_peak_cache(db)
    return {"status": "ok"}
