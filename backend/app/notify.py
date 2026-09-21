"""Notify a user about a new chat message.

Web push goes to every subscribed device when the recipient hasn't been active in the
last minute. If they have no push subscription at all, an SMS nudge goes out instead
(once the toll-free number is verified), throttled to one per conversation per 30 min.
"""

import json
import logging
from datetime import timedelta

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Connection, Message, PushSubscription, User, now

log = logging.getLogger(__name__)

ACTIVE_WINDOW = timedelta(seconds=60)
SMS_THROTTLE = timedelta(minutes=30)


def _as_utc(dt):
    from app.account import as_utc

    return as_utc(dt)


def touch_last_seen(db: Session, user: User) -> None:
    """Called on polling reads; throttled so it's one UPDATE per ~30s, not per poll."""
    t = now()
    if user.last_seen_at is None or (t - _as_utc(user.last_seen_at)) > timedelta(seconds=30):
        user.last_seen_at = t
        db.commit()


def is_active(user: User) -> bool:
    return user.last_seen_at is not None and (now() - _as_utc(user.last_seen_at)) < ACTIVE_WINDOW


def send_push(db: Session, sub: PushSubscription, payload: dict) -> bool:
    st = get_settings()
    if not st.vapid_private_key:
        return False
    try:
        from pywebpush import webpush

        webpush(
            subscription_info={
                "endpoint": sub.endpoint,
                "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
            },
            data=json.dumps(payload),
            vapid_private_key=st.vapid_private_key,
            vapid_claims={"sub": st.vapid_subject},
            ttl=60 * 60,
            timeout=8,
        )
        return True
    except Exception as e:  # noqa: BLE001
        status = getattr(getattr(e, "response", None), "status_code", None)
        if status in (404, 410):
            db.delete(sub)  # the browser dropped this subscription
            db.commit()
        else:
            log.warning("push failed (%s): %s", status, e)
        return False


def send_sms(to: str, body: str) -> bool:
    st = get_settings()
    if not (st.sms_notifications_enabled and st.twilio_account_sid and st.twilio_from_number):
        return False
    try:
        import httpx

        r = httpx.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{st.twilio_account_sid}/Messages.json",
            auth=(st.twilio_account_sid, st.twilio_auth_token),
            data={"To": to, "From": st.twilio_from_number, "Body": body},
            timeout=10,
        )
        return r.status_code < 300
    except Exception:  # noqa: BLE001
        log.exception("sms failed")
        return False


def notify_new_message(db: Session, c: Connection, m: Message, sender: User) -> None:
    recipient = c.worker if sender.id == c.customer_id else c.customer
    if is_active(recipient):
        return
    sender_profile = sender.worker_profile or sender.customer_profile
    name = sender_profile.display_name if sender_profile else "Kaam"
    lang = recipient.preferred_language or "en"
    text = (m.translations or {}).get(lang) or m.body
    payload = {
        "title": name,
        "body": text[:180],
        "url": f"/chat/{c.id}",
        "tag": f"conn-{c.id}",
    }
    subs = db.query(PushSubscription).filter(PushSubscription.user_id == recipient.id).all()
    delivered = any(send_push(db, s, payload) for s in list(subs))
    if delivered or subs:
        return
    # No device to push to: fall back to an SMS nudge, throttled per conversation.
    col = "worker_last_sms_at" if recipient.id == c.worker_id else "customer_last_sms_at"
    last = getattr(c, col)
    if last is not None and (now() - _as_utc(last)) < SMS_THROTTLE:
        return
    if not recipient.phone:
        return
    st = get_settings()
    if lang == "hi":
        body = f"{name} ने आपको Kaam पर संदेश भेजा है। जवाब देने के लिए {st.site_url} खोलें।"
    else:
        body = f"{name} sent you a message on Kaam. Open {st.site_url} to reply."
    if send_sms(recipient.phone, body + " Reply STOP to opt out."):
        setattr(c, col, now())
        db.commit()
