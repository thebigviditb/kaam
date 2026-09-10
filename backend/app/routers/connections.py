from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.deps import get_current_user
from app.models import Connection, CustomerProfile, User, WorkerProfile
from app.routers.profiles import connection_between, customer_out, worker_out
from app.schemas import ConnectionCreate, ConnectionDecision, ConnectionOut

router = APIRouter(prefix="/connections", tags=["connections"])


def _out(c: Connection, viewer: User) -> ConnectionOut:
    out = ConnectionOut(
        id=c.id,
        customer_id=c.customer_id,
        worker_id=c.worker_id,
        initiated_by=c.initiated_by,
        message=c.message,
        status=c.status,
        created_at=c.created_at,
    )
    if c.worker.worker_profile is not None:
        out.worker = worker_out(c.worker.worker_profile, viewer, c)
    if c.customer.customer_profile is not None:
        out.customer = customer_out(c.customer.customer_profile, viewer, c)
    return out


def _load(db: Session):
    return db.query(Connection).options(
        joinedload(Connection.worker).joinedload(User.worker_profile),
        joinedload(Connection.worker).joinedload(User.media),
        joinedload(Connection.customer).joinedload(User.customer_profile),
    )


@router.post("", response_model=ConnectionOut, status_code=status.HTTP_201_CREATED)
def create(
    body: ConnectionCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    if user.role == "worker":
        if user.worker_profile is None:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "finish onboarding first")
        if not body.customer_id:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "customer_id required")
        target = db.get(CustomerProfile, body.customer_id)
        if target is None or not target.is_active:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "customer not found")
        customer_id, worker_id = body.customer_id, user.id
    else:
        if user.customer_profile is None:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "finish onboarding first")
        if not body.worker_id:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "worker_id required")
        target = db.get(WorkerProfile, body.worker_id)
        if target is None or not target.is_visible:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "worker not found")
        customer_id, worker_id = user.id, body.worker_id

    if connection_between(db, customer_id, worker_id):
        raise HTTPException(status.HTTP_409_CONFLICT, "already connected")
    c = Connection(
        customer_id=customer_id,
        worker_id=worker_id,
        initiated_by=user.role,
        message=body.message,
    )
    db.add(c)
    db.commit()
    c = _load(db).filter(Connection.id == c.id).one()
    return _out(c, user)


@router.get("/me", response_model=list[ConnectionOut])
def mine(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    col = Connection.worker_id if user.role == "worker" else Connection.customer_id
    rows = _load(db).filter(col == user.id).order_by(Connection.updated_at.desc()).all()
    return [_out(c, user) for c in rows]


@router.patch("/{connection_id}", response_model=ConnectionOut)
def decide(
    connection_id: str,
    body: ConnectionDecision,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    c = _load(db).filter(Connection.id == connection_id).one_or_none()
    mine_id = c.worker_id if user.role == "worker" else c.customer_id if c else None
    if c is None or mine_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "connection not found")
    if c.initiated_by == user.role:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "only the other party can decide")
    c.status = body.status
    db.commit()
    db.refresh(c)
    return _out(c, user)


@router.delete("/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
def withdraw(
    connection_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    c = db.get(Connection, connection_id)
    if c is None or user.id not in (c.worker_id, c.customer_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "connection not found")
    db.delete(c)
    db.commit()
