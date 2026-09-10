import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def new_id() -> str:
    return str(uuid.uuid4())


def now() -> datetime:
    return datetime.now(UTC)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    cognito_sub: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    role: Mapped[str] = mapped_column(String(16))
    email: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(32), index=True)
    preferred_language: Mapped[str] = mapped_column(String(8), default="en")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    worker_profile: Mapped["WorkerProfile | None"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    customer_profile: Mapped["CustomerProfile | None"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    media: Mapped[list["Media"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )


class WorkerProfile(Base):
    """What a worker can do and when they are available. Location is not tracked."""

    __tablename__ = "worker_profiles"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), primary_key=True)
    display_name: Mapped[str] = mapped_column(String(120))
    bio: Mapped[str] = mapped_column(Text, default="")
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    other_tag_text: Mapped[str | None] = mapped_column(String(255))
    years_experience: Mapped[int] = mapped_column(Integer, default=0)
    hourly_rate: Mapped[float | None] = mapped_column(Numeric(10, 2))
    days: Mapped[list[str]] = mapped_column(JSON, default=list)
    times: Mapped[list[str]] = mapped_column(JSON, default=list)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)

    user: Mapped[User] = relationship(back_populates="worker_profile")


class CustomerProfile(Base):
    """A household's need: what work, where, when, and what they expect to pay."""

    __tablename__ = "customer_profiles"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), primary_key=True)
    display_name: Mapped[str] = mapped_column(String(120))
    city: Mapped[str] = mapped_column(String(64), index=True)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    other_tag_text: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    pay_amount: Mapped[float | None] = mapped_column(Numeric(10, 2))
    pay_type: Mapped[str] = mapped_column(String(16), default="hourly")
    start_timing: Mapped[str] = mapped_column(String(32), default="flexible")
    days: Mapped[list[str]] = mapped_column(JSON, default=list)
    times: Mapped[list[str]] = mapped_column(JSON, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)

    user: Mapped[User] = relationship(back_populates="customer_profile")


class Connection(Base):
    """A worker and a customer reaching out to each other. One per pair."""

    __tablename__ = "connections"
    __table_args__ = (UniqueConstraint("customer_id", "worker_id", name="uq_connection_pair"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    customer_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    worker_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    initiated_by: Mapped[str] = mapped_column(String(16))  # worker | customer
    message: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(16), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)

    customer_last_read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    worker_last_read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    customer: Mapped[User] = relationship(foreign_keys=[customer_id])
    worker: Mapped[User] = relationship(foreign_keys=[worker_id])
    messages: Mapped[list["Message"]] = relationship(
        back_populates="connection", cascade="all, delete-orphan", order_by="Message.created_at"
    )


class Message(Base):
    """A chat message inside an accepted connection."""

    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    connection_id: Mapped[str] = mapped_column(String(36), ForeignKey("connections.id"), index=True)
    sender_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)

    connection: Mapped[Connection] = relationship(back_populates="messages")


class Media(Base):
    __tablename__ = "media"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    owner_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    kind: Mapped[str] = mapped_column(String(16))
    s3_key: Mapped[str] = mapped_column(String(512), unique=True)
    content_type: Mapped[str] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    owner: Mapped[User] = relationship(back_populates="media")
