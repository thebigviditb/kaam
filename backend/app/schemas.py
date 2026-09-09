from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.constants import CITIES, TAGS

Role = Literal["worker", "customer"]
Language = Literal["en", "hi"]
PayType = Literal["hourly", "daily", "monthly", "one_time"]
JobStatus = Literal["open", "filled", "closed"]
ApplicationStatus = Literal["pending", "accepted", "rejected"]
MediaKind = Literal["image", "video"]


def _check_tags(tags: list[str]) -> list[str]:
    bad = [t for t in tags if t not in TAGS]
    if bad:
        raise ValueError(f"unknown tags: {bad}")
    return list(dict.fromkeys(tags))


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


class UserCreate(BaseModel):
    role: Role
    phone: str | None = Field(default=None, max_length=32)
    preferred_language: Language = "en"


class UserUpdate(BaseModel):
    phone: str | None = Field(default=None, max_length=32)
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


# ---- worker profile ----


class WorkerProfileIn(BaseModel):
    display_name: str = Field(min_length=1, max_length=120)
    bio: str = Field(default="", max_length=2000)
    tags: list[str] = []
    other_tag_text: str | None = Field(default=None, max_length=255)
    years_experience: int = Field(default=0, ge=0, le=60)
    hourly_rate: float | None = Field(default=None, ge=0)
    city: str
    availability: str = Field(default="", max_length=255)
    is_visible: bool = True

    _tags = field_validator("tags")(_check_tags)
    _city = field_validator("city")(_check_city)


class WorkerProfileOut(ORM):
    user_id: str
    display_name: str
    bio: str
    tags: list[str]
    other_tag_text: str | None
    years_experience: int
    hourly_rate: float | None
    city: str
    availability: str
    is_visible: bool
    updated_at: datetime
    media: list[MediaOut] = []
    phone: str | None = None


# ---- customer profile ----


class CustomerProfileIn(BaseModel):
    display_name: str = Field(min_length=1, max_length=120)
    city: str

    _city = field_validator("city")(_check_city)


class CustomerProfileOut(ORM):
    user_id: str
    display_name: str
    city: str


# ---- jobs ----


class JobIn(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    tags: list[str] = Field(min_length=1)
    other_tag_text: str | None = Field(default=None, max_length=255)
    description: str = Field(default="", max_length=4000)
    pay_amount: float = Field(gt=0)
    pay_type: PayType
    city: str
    schedule: str = Field(default="", max_length=255)

    _tags = field_validator("tags")(_check_tags)
    _city = field_validator("city")(_check_city)


class JobUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    tags: list[str] | None = None
    other_tag_text: str | None = None
    description: str | None = Field(default=None, max_length=4000)
    pay_amount: float | None = Field(default=None, gt=0)
    pay_type: PayType | None = None
    city: str | None = None
    schedule: str | None = Field(default=None, max_length=255)
    status: JobStatus | None = None

    @field_validator("tags")
    @classmethod
    def _tags(cls, v):
        return _check_tags(v) if v is not None else v

    @field_validator("city")
    @classmethod
    def _city(cls, v):
        return _check_city(v) if v is not None else v


class JobOut(ORM):
    id: str
    customer_id: str
    customer_name: str = ""
    title: str
    tags: list[str]
    other_tag_text: str | None
    description: str
    pay_amount: float
    pay_type: PayType
    city: str
    schedule: str
    status: JobStatus
    created_at: datetime
    application_count: int = 0
    my_application_status: ApplicationStatus | None = None


# ---- applications ----


class ApplicationIn(BaseModel):
    message: str = Field(default="", max_length=2000)


class ApplicationUpdate(BaseModel):
    status: Literal["accepted", "rejected"]


class ApplicationOut(ORM):
    id: str
    job_id: str
    worker_id: str
    message: str
    status: ApplicationStatus
    created_at: datetime
    job: JobOut | None = None
    worker: WorkerProfileOut | None = None


class MetaOut(BaseModel):
    tags: list[str]
    cities: list[str]
    pay_types: list[str]
