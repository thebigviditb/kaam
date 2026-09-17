"""Account deletion with a grace period.

Request → profile hidden + timestamp. A later sign-in (or POST /me/restore) cancels it.
A daily cron purges accounts whose grace period has passed: Cognito user, S3 media,
and every row that references them.
"""

import logging
from datetime import UTC, datetime, timedelta

import boto3
from sqlalchemy.orm import Session

from app import storage
from app.config import get_settings
from app.models import Connection, Feedback, Message, PushSubscription, Report, User, now

log = logging.getLogger(__name__)


def as_utc(dt: datetime) -> datetime:
    """SQLite hands back naive datetimes; they were stored as UTC."""
    return dt if dt.tzinfo else dt.replace(tzinfo=UTC)


def request_deletion(db: Session, user: User) -> None:
    user.deletion_requested_at = now()
    if user.worker_profile:
        user.worker_profile.is_visible = False
    if user.customer_profile:
        user.customer_profile.is_active = False
    db.commit()


def restore_account(db: Session, user: User) -> None:
    user.deletion_requested_at = None
    if user.worker_profile:
        user.worker_profile.is_visible = True
    if user.customer_profile:
        user.customer_profile.is_active = True
    db.commit()


def scheduled_for(user: User):
    if not user.deletion_requested_at:
        return None
    return as_utc(user.deletion_requested_at) + timedelta(days=get_settings().deletion_grace_days)


def _delete_cognito_user(sub: str) -> None:
    st = get_settings()
    if not st.cognito_user_pool_id:
        return
    client = boto3.client(
        "cognito-idp",
        region_name=st.cognito_region,
        aws_access_key_id=st.media_aws_access_key_id or None,
        aws_secret_access_key=st.media_aws_secret_access_key or None,
    )
    try:
        client.admin_delete_user(UserPoolId=st.cognito_user_pool_id, Username=sub)
    except client.exceptions.UserNotFoundException:
        pass


def purge_user(db: Session, user: User) -> None:
    """Hard-delete one account everywhere. Order matters for foreign keys."""
    conn_ids = [
        c.id
        for c in db.query(Connection)
        .filter((Connection.worker_id == user.id) | (Connection.customer_id == user.id))
        .all()
    ]
    if conn_ids:
        db.query(Message).filter(Message.connection_id.in_(conn_ids)).delete(
            synchronize_session=False
        )
        db.query(Report).filter(Report.connection_id.in_(conn_ids)).delete(
            synchronize_session=False
        )
        db.query(Connection).filter(Connection.id.in_(conn_ids)).delete(synchronize_session=False)
    db.query(Message).filter(Message.sender_id == user.id).delete(synchronize_session=False)
    db.query(Report).filter(
        (Report.reporter_id == user.id) | (Report.reported_user_id == user.id)
    ).delete(synchronize_session=False)
    db.query(Feedback).filter(Feedback.user_id == user.id).delete(synchronize_session=False)
    db.query(PushSubscription).filter(PushSubscription.user_id == user.id).delete(
        synchronize_session=False
    )
    db.query(User).filter(User.referred_by_id == user.id).update(
        {User.referred_by_id: None}, synchronize_session=False
    )
    for m in list(user.media):
        try:
            storage.delete_object(m.s3_key)
        except Exception:  # noqa: BLE001 - keep purging
            log.exception("could not delete media %s", m.s3_key)
    sub = user.cognito_sub
    db.delete(user)  # cascades profiles + media rows
    db.commit()
    _delete_cognito_user(sub)


def purge_due(db: Session) -> list[str]:
    cutoff = now() - timedelta(days=get_settings().deletion_grace_days)
    due = db.query(User).filter(User.deletion_requested_at <= cutoff).all()
    purged = []
    for u in due:
        purge_user(db, u)
        purged.append(u.id)
    return purged
