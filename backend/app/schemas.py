from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.constants import CITIES, DAYS, REPORT_REASONS, TAGS, TIMES

Role = Literal["worker", "customer"]
Language = Literal["en", "hi"]
PayType = Literal["hourly", "daily", "monthly", "one_time"]
StartTiming = Literal["asap", "within_2_weeks", "within_month", "flexible"]
ConnectionStatus = Literal["pending", "accepted", "declined"]
MediaKind = Literal["image", "video"]


def _subset(allowed: list[str], what: str):
    def check(values: list[str]) -> list[str]:
        bad = [v for v in values if v not in allowed]
        if bad:
            raise ValueError(f"unknown {what}: {bad}")
        return list(dict.fromkeys(values))

    return check


_check_tags = _subset(TAGS, "tags")
_check_days = _subset(DAYS, "days")
_check_times = _subset(TIMES, "times")
_check_cities = _subset(CITIES, "cities")


def _check_city(city: str) -> str:
    if city not in CITIES:
        raise ValueError(f"unknown city: {city}")
    return city


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---- users / me ----


class UserOut(ORM):
    id: str
    role: Role
    email: str | None
    phone: str | None
    preferred_language: Language
    created_at: datetime
    onboarded: bool = False


class UserCreate(BaseModel):
    role: Role
    phone: str = Field(min_length=7, max_length=32)
    preferred_language: Language = "en"


class UserUpdate(BaseModel):
    phone: str | None = Field(default=None, min_length=7, max_length=32)
    preferred_language: Language | None = None


# ---- media ----


class MediaOut(ORM):
    id: str
    kind: MediaKind
    content_type: str
    url: str = ""
    created_at: datetime


class PresignRequest(BaseModel):
    kind: MediaKind
    content_type: str = Field(max_length=128)
    size_bytes: int = Field(gt=0)


class PresignResponse(BaseModel):
    upload_url: str
    s3_key: str
    headers: dict[str, str]


class MediaRegister(BaseModel):
    kind: MediaKind
    s3_key: str = Field(max_length=512)
    content_type: str = Field(max_length=128)


# ---- connection summary embedded in profiles ----


class ConnectionSummary(BaseModel):
    id: str
    status: ConnectionStatus
    initiated_by: Role
    message: str = ""


# ---- worker profile ----


class WorkerProfileIn(BaseModel):
    display_name: str = Field(min_length=1, max_length=120)
    bio: str = Field(default="", max_length=2000)
    tags: list[str] = Field(min_length=1)
    other_tag_text: str | None = Field(default=None, max_length=255)
    years_experience: int = Field(default=0, ge=0, le=60)
    hourly_rate: float | None = Field(default=None, ge=0)
    city: str
    work_cities: list[str] = Field(min_length=1)
    days: list[str] = Field(min_length=1)
    times: list[str] = Field(min_length=1)
    is_visible: bool = True

    _tags = field_validator("tags")(_check_tags)
    _days = field_validator("days")(_check_days)
    _times = field_validator("times")(_check_times)
    _city = field_validator("city")(_check_city)
    _work_cities = field_validator("work_cities")(_check_cities)


class WorkerProfileOut(ORM):
    user_id: str
    display_name: str
    bio: str
    tags: list[str]
    other_tag_text: str | None
    years_experience: int
    hourly_rate: float | None
    city: str
    work_cities: list[str]
    days: list[str]
    times: list[str]
    is_visible: bool
    updated_at: datetime
    media: list[MediaOut] = []
    phone: str | None = None
    connection: ConnectionSummary | None = None
    match_score: int = 0


# ---- customer profile (the household's need) ----


class CustomerProfileIn(BaseModel):
    display_name: str = Field(min_length=1, max_length=120)
    city: str
    tags: list[str] = Field(min_length=1)
    other_tag_text: str | None = Field(default=None, max_length=255)
    description: str = Field(default="", max_length=4000)
    pay_amount: float | None = Field(default=None, ge=0)
    pay_type: PayType = "hourly"
    start_timing: StartTiming = "flexible"
    days: list[str] = Field(min_length=1)
    times: list[str] = Field(min_length=1)
    is_active: bool = True

    _tags = field_validator("tags")(_check_tags)
    _days = field_validator("days")(_check_days)
    _times = field_validator("times")(_check_times)
    _city = field_validator("city")(_check_city)


class CustomerProfileOut(ORM):
    user_id: str
    display_name: str
    city: str
    tags: list[str]
    other_tag_text: str | None
    description: str
    pay_amount: float | None
    pay_type: PayType
    start_timing: StartTiming
    days: list[str]
    times: list[str]
    is_active: bool
    updated_at: datetime
    phone: str | None = None
    connection: ConnectionSummary | None = None
    match_score: int = 0


# ---- connections ----


class ConnectionCreate(BaseModel):
    """A worker passes customer_id; a customer passes worker_id."""

    customer_id: str | None = None
    worker_id: str | None = None
    message: str = Field(default="", max_length=2000)


class ConnectionDecision(BaseModel):
    status: Literal["accepted", "declined"]


class ChatMessage(ORM):
    id: str
    connection_id: str
    sender_id: str
    body: str
    created_at: datetime


class ChatMessageIn(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class ConnectionOut(BaseModel):
    id: str
    customer_id: str
    worker_id: str
    initiated_by: Role
    message: str
    status: ConnectionStatus
    created_at: datetime
    worker: WorkerProfileOut | None = None
    customer: CustomerProfileOut | None = None
    last_message: ChatMessage | None = None
    unread_count: int = 0


class ReportIn(BaseModel):
    reported_user_id: str
    connection_id: str | None = None
    reason: Literal[
        "inappropriate_behavior", "harassment", "scam_or_fraud", "no_show", "fake_profile", "other"
    ]
    description: str = Field(default="", max_length=2000)


class ReportOut(BaseModel):
    id: str
    created_at: datetime


class MetaOut(BaseModel):
    tags: list[str]
    cities: list[str]
    pay_types: list[str]
    days: list[str]
    times: list[str]
    start_timings: list[str]
    report_reasons: list[str] = REPORT_REASONS
