from pydantic import BaseModel, Field
from typing import Optional, Literal, Any
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserProfile(BaseModel):
    user_id: str
    oauth_sub: str
    email: Optional[str] = None
    name: Optional[str] = None
    city: Optional[str] = None
    created_at: Optional[datetime] = None


# ── Shifts ────────────────────────────────────────────────────────────────────

PlatformEnum = Literal["uber", "doordash", "lyft", "instacart", "other"]


class ShiftCreate(BaseModel):
    platform: PlatformEnum
    start_time: datetime
    end_time: datetime
    earnings: float
    tips: float = 0.0
    city: str


class ShiftResponse(BaseModel):
    id: str
    user_id: str
    platform: str
    start_time: datetime
    end_time: datetime
    earnings: float
    tips: float
    city: str
    day_of_week: int
    hour_of_day: int
    earnings_per_hour: float
    hours_worked: float


# ── Analytics ─────────────────────────────────────────────────────────────────

class PeakWindow(BaseModel):
    day_of_week: int          # 0=Monday, 6=Sunday
    hour_of_day: int          # 0-23
    avg_earnings_per_hour: float
    sample_count: int
    source: Literal["personal", "community"]


class PeakTimesResponse(BaseModel):
    windows: list[PeakWindow]
    data_source: Literal["personal", "community"]
    shift_count: int


class EarningsSummary(BaseModel):
    total_this_week: float
    total_this_month: float
    avg_per_hour_all_time: float
    best_shift_date: Optional[str]
    best_shift_amount: Optional[float]
    hours_this_week: float
    shift_count: int


# ── Agent ─────────────────────────────────────────────────────────────────────

class AgentDriverSummary(BaseModel):
    user_id: str
    city: str
    shift_count: int
    data_source: Literal["personal", "community"]
    top_peak_windows: list[dict]
    earnings_trend_4_weeks: list[dict]
    best_platform: Optional[str]
    worst_platform: Optional[str]
    best_day_of_week: Optional[int]
    worst_day_of_week: Optional[int]
    recent_10_shifts: list[dict]


class SaveInsightRequest(BaseModel):
    user_id: str
    insight_text: str
    top_suggestion: str
    data_snapshot: Optional[Any] = None


class InsightResponse(BaseModel):
    id: str
    user_id: str
    generated_at: datetime
    insight_text: str
    top_suggestion: str


# ── User update ───────────────────────────────────────────────────────────────

class UserUpdate(BaseModel):
    city: Optional[str] = None
    name: Optional[str] = None
