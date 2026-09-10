from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app import storage
from app.db import get_db
from app.deps import get_current_user, require_customer, require_worker
from app.matching import filter_lists, match_score
from app.models import Connection, CustomerProfile, User, WorkerProfile
from app.schemas import (
    ConnectionSummary,
    CustomerProfileIn,
    CustomerProfileOut,
    MediaOut,
    WorkerProfileIn,
    WorkerProfileOut,
)

router = APIRouter(tags=["profiles"])


# ---- output helpers -------------------------------------------------------


def connection_between(db: Session, customer_id: str, worker_id: str) -> Connection | None:
    return (
        db.query(Connection)
        .filter(Connection.customer_id == customer_id, Connection.worker_id == worker_id)
        .one_or_none()
    )


def _summary(c: Connection | None) -> ConnectionSummary | None:
    if c is None:
        return None
    return ConnectionSummary(
        id=c.id, status=c.status, initiated_by=c.initiated_by, message=c.message
    )


def _reveal_phone(viewer: User, owner: User, c: Connection | None) -> bool:
    return viewer.id == owner.id or (c is not None and c.status == "accepted")


def worker_out(p: WorkerProfile, viewer: User, c: Connection | None = None) -> WorkerProfileOut:
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
    out.phone = p.user.phone if _reveal_phone(viewer, p.user, c) else None
    out.connection = _summary(c)
    if viewer.customer_profile is not None:
        out.match_score = match_score(p, viewer.customer_profile)
    return out


def customer_out(
    p: CustomerProfile, viewer: User, c: Connection | None = None
) -> CustomerProfileOut:
    out = CustomerProfileOut.model_validate(p)
    out.phone = p.user.phone if _reveal_phone(viewer, p.user, c) else None
    out.connection = _summary(c)
    if viewer.worker_profile is not None:
        out.match_score = match_score(viewer.worker_profile, p)
    return out


def _connections_for(db: Session, viewer: User) -> dict[str, Connection]:
    """All of the viewer's connections keyed by the *other* party's user id."""
    if viewer.role == "worker":
        rows = db.query(Connection).filter(Connection.worker_id == viewer.id).all()
        return {c.customer_id: c for c in rows}
    rows = db.query(Connection).filter(Connection.customer_id == viewer.id).all()
    return {c.worker_id: c for c in rows}


def _check_other(tags: list[str], other_text: str | None) -> None:
    if "other" in tags and not other_text:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "describe the 'other' work")


# ---- worker profile -------------------------------------------------------


@router.get("/workers/me", response_model=WorkerProfileOut)
def get_my_worker_profile(user: User = Depends(require_worker)):
    if user.worker_profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "no profile yet")
    return worker_out(user.worker_profile, user)


@router.put("/workers/me", response_model=WorkerProfileOut)
def upsert_my_worker_profile(
    body: WorkerProfileIn, user: User = Depends(require_worker), db: Session = Depends(get_db)
):
    _check_other(body.tags, body.other_tag_text)
    profile = user.worker_profile or WorkerProfile(user_id=user.id)
    for k, v in body.model_dump().items():
        setattr(profile, k, v)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return worker_out(profile, user)


@router.get("/workers", response_model=list[WorkerProfileOut])
def list_workers(
    tags: list[str] | None = Query(default=None),
    days: list[str] | None = Query(default=None),
    times: list[str] | None = Query(default=None),
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
        .filter(WorkerProfile.is_visible.is_(True), WorkerProfile.user_id != user.id)
    )
    if max_rate is not None:
        query = query.filter(WorkerProfile.hourly_rate <= max_rate)
    if min_experience is not None:
        query = query.filter(WorkerProfile.years_experience >= min_experience)
    if q:
        like = f"%{q}%"
        query = query.filter(WorkerProfile.display_name.ilike(like) | WorkerProfile.bio.ilike(like))
    rows = filter_lists(query.order_by(WorkerProfile.updated_at.desc()).all(), tags, days, times)
    if city:
        rows = [r for r in rows if city in (r.work_cities or []) or r.city == city]
    conns = _connections_for(db, user)
    return [worker_out(r, user, conns.get(r.user_id)) for r in rows[offset : offset + limit]]


@router.get("/workers/matching", response_model=list[WorkerProfileOut])
def matching_workers(user: User = Depends(require_customer), db: Session = Depends(get_db)):
    """Visible workers ranked by how well they fit this household's need."""
    need = user.customer_profile
    if need is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "finish onboarding first")
    rows = (
        db.query(WorkerProfile)
        .options(joinedload(WorkerProfile.user).joinedload(User.media))
        .filter(WorkerProfile.is_visible.is_(True))
        .all()
    )
    conns = _connections_for(db, user)
    scored = [(match_score(r, need), r) for r in rows]
    scored = sorted((s for s in scored if s[0] > 0), key=lambda s: -s[0])
    return [worker_out(r, user, conns.get(r.user_id)) for _, r in scored]


@router.get("/workers/{user_id}", response_model=WorkerProfileOut)
def get_worker(user_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.get(WorkerProfile, user_id)
    if p is None or (not p.is_visible and p.user_id != user.id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "worker not found")
    c = connection_between(db, user.id, user_id) if user.role == "customer" else None
    return worker_out(p, user, c)


# ---- customer profile (the need) ------------------------------------------


@router.get("/customers/me", response_model=CustomerProfileOut)
def get_my_customer_profile(user: User = Depends(require_customer)):
    if user.customer_profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "no profile yet")
    return customer_out(user.customer_profile, user)


@router.put("/customers/me", response_model=CustomerProfileOut)
def upsert_my_customer_profile(
    body: CustomerProfileIn, user: User = Depends(require_customer), db: Session = Depends(get_db)
):
    _check_other(body.tags, body.other_tag_text)
    profile = user.customer_profile or CustomerProfile(user_id=user.id)
    for k, v in body.model_dump().items():
        setattr(profile, k, v)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return customer_out(profile, user)


@router.get("/customers", response_model=list[CustomerProfileOut])
def list_customers(
    tags: list[str] | None = Query(default=None),
    days: list[str] | None = Query(default=None),
    times: list[str] | None = Query(default=None),
    city: str | None = None,
    min_pay: float | None = None,
    pay_type: str | None = None,
    start_timing: str | None = None,
    q: str | None = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(CustomerProfile)
        .options(joinedload(CustomerProfile.user))
        .filter(CustomerProfile.is_active.is_(True), CustomerProfile.user_id != user.id)
    )
    if city:
        query = query.filter(CustomerProfile.city == city)
    if min_pay is not None:
        query = query.filter(CustomerProfile.pay_amount >= min_pay)
    if pay_type:
        query = query.filter(CustomerProfile.pay_type == pay_type)
    if start_timing:
        query = query.filter(CustomerProfile.start_timing == start_timing)
    if q:
        like = f"%{q}%"
        query = query.filter(
            CustomerProfile.display_name.ilike(like) | CustomerProfile.description.ilike(like)
        )
    rows = filter_lists(query.order_by(CustomerProfile.updated_at.desc()).all(), tags, days, times)
    conns = _connections_for(db, user)
    return [customer_out(r, user, conns.get(r.user_id)) for r in rows[offset : offset + limit]]


@router.get("/customers/matching", response_model=list[CustomerProfileOut])
def matching_customers(user: User = Depends(require_worker), db: Session = Depends(get_db)):
    """Active households ranked by fit with this worker's skills and availability.

    This is the endpoint the voice agent will call ("what work is available for me?").
    """
    me = user.worker_profile
    if me is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "finish onboarding first")
    rows = (
        db.query(CustomerProfile)
        .options(joinedload(CustomerProfile.user))
        .filter(CustomerProfile.is_active.is_(True))
        .all()
    )
    conns = _connections_for(db, user)
    scored = [(match_score(me, r), r) for r in rows]
    scored = sorted((s for s in scored if s[0] > 0), key=lambda s: -s[0])
    return [customer_out(r, user, conns.get(r.user_id)) for _, r in scored]


@router.get("/customers/{user_id}", response_model=CustomerProfileOut)
def get_customer(
    user_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    p = db.get(CustomerProfile, user_id)
    if p is None or (not p.is_active and p.user_id != user.id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "customer not found")
    c = connection_between(db, user_id, user.id) if user.role == "worker" else None
    return customer_out(p, user, c)
