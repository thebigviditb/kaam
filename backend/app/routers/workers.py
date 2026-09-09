from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app import storage
from app.db import get_db
from app.deps import get_current_user, require_customer, require_worker
from app.models import CustomerProfile, User, WorkerProfile
from app.schemas import (
    CustomerProfileIn,
    CustomerProfileOut,
    MediaOut,
    WorkerProfileIn,
    WorkerProfileOut,
)

router = APIRouter(tags=["profiles"])


def worker_out(p: WorkerProfile, include_phone: bool = False) -> WorkerProfileOut:
    out = WorkerProfileOut.model_validate(p)
    out.media = [
        MediaOut(
            id=m.id,
            kind=m.kind,
            content_type=m.content_type,
            url=storage.presign_get(m.s3_key),
            created_at=m.created_at,
        )
        for m in p.user.media
    ]
    out.phone = p.user.phone if include_phone else None
    return out


@router.get("/workers/me", response_model=WorkerProfileOut)
def get_my_worker_profile(user: User = Depends(require_worker)):
    if user.worker_profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "no profile yet")
    return worker_out(user.worker_profile, include_phone=True)


@router.put("/workers/me", response_model=WorkerProfileOut)
def upsert_my_worker_profile(
    body: WorkerProfileIn, user: User = Depends(require_worker), db: Session = Depends(get_db)
):
    profile = user.worker_profile or WorkerProfile(user_id=user.id)
    for k, v in body.model_dump().items():
        setattr(profile, k, v)
    if "other" in profile.tags and not profile.other_tag_text:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "describe the 'other' skill")
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return worker_out(profile, include_phone=True)


@router.get("/workers", response_model=list[WorkerProfileOut])
def list_workers(
    tags: list[str] | None = Query(default=None),
    city: str | None = None,
    max_rate: float | None = None,
    min_experience: int | None = None,
    q: str | None = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(WorkerProfile)
        .options(joinedload(WorkerProfile.user).joinedload(User.media))
        .filter(WorkerProfile.is_visible.is_(True))
    )
    if city:
        query = query.filter(WorkerProfile.city == city)
    if max_rate is not None:
        query = query.filter(WorkerProfile.hourly_rate <= max_rate)
    if min_experience is not None:
        query = query.filter(WorkerProfile.years_experience >= min_experience)
    if q:
        like = f"%{q}%"
        query = query.filter(WorkerProfile.display_name.ilike(like) | WorkerProfile.bio.ilike(like))
    rows = query.order_by(WorkerProfile.updated_at.desc()).all()
    # Tag matching is done in Python: tags are JSON on both SQLite and Postgres.
    if tags:
        wanted = set(tags)
        rows = [r for r in rows if wanted & set(r.tags or [])]
    rows = rows[offset : offset + limit]
    # Phone is shown only to customers, who need it to get in touch.
    return [worker_out(r, include_phone=user.role == "customer") for r in rows]


@router.get("/workers/{user_id}", response_model=WorkerProfileOut)
def get_worker(user_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.get(WorkerProfile, user_id)
    if p is None or (not p.is_visible and p.user_id != user.id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "worker not found")
    return worker_out(p, include_phone=user.role == "customer" or p.user_id == user.id)


@router.get("/customers/me", response_model=CustomerProfileOut)
def get_my_customer_profile(user: User = Depends(require_customer)):
    if user.customer_profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "no profile yet")
    return user.customer_profile


@router.put("/customers/me", response_model=CustomerProfileOut)
def upsert_my_customer_profile(
    body: CustomerProfileIn, user: User = Depends(require_customer), db: Session = Depends(get_db)
):
    profile = user.customer_profile or CustomerProfile(user_id=user.id)
    for k, v in body.model_dump().items():
        setattr(profile, k, v)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile
