from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db import get_db
from app.deps import get_current_user
from app.models import PushSubscription, User
from app.schemas import PushSubscriptionIn, PushUnsubscribe

router = APIRouter(prefix="/push", tags=["push"])


@router.get("/public-key")
def public_key(settings: Settings = Depends(get_settings)):
    return {"public_key": settings.vapid_public_key}


@router.post("/subscriptions", status_code=status.HTTP_201_CREATED)
def subscribe(
    body: PushSubscriptionIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    sub = db.query(PushSubscription).filter(PushSubscription.endpoint == body.endpoint).first()
    if sub is None:
        sub = PushSubscription(endpoint=body.endpoint)
        db.add(sub)
    # An endpoint belongs to whoever is logged in on that device now.
    sub.user_id = user.id
    sub.p256dh = body.keys.p256dh
    sub.auth = body.keys.auth
    sub.user_agent = body.user_agent
    db.commit()
    return {"ok": True}


@router.delete("/subscriptions", status_code=status.HTTP_204_NO_CONTENT)
def unsubscribe(
    body: PushUnsubscribe, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    db.query(PushSubscription).filter(
        PushSubscription.endpoint == body.endpoint, PushSubscription.user_id == user.id
    ).delete(synchronize_session=False)
    db.commit()
