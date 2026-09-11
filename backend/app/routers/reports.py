from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import Connection, Report, User
from app.schemas import ReportIn, ReportOut

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def create_report(
    body: ReportIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    if body.reported_user_id == user.id:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "cannot report yourself")
    if db.get(User, body.reported_user_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "user not found")
    if body.reason == "other" and not body.description.strip():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "describe the problem")
    if body.connection_id:
        c = db.get(Connection, body.connection_id)
        if c is None or user.id not in (c.worker_id, c.customer_id):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "connection not found")
    r = Report(
        reporter_id=user.id,
        reported_user_id=body.reported_user_id,
        connection_id=body.connection_id,
        reason=body.reason,
        description=body.description.strip(),
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return ReportOut(id=r.id, created_at=r.created_at)
