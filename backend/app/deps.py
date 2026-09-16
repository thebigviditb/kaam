from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import Claims, get_claims
from app.db import get_db
from app.models import User


def get_current_user(claims: Claims = Depends(get_claims), db: Session = Depends(get_db)) -> User:
    user = db.query(User).filter(User.cognito_sub == claims.sub).one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "user not registered; call POST /me")
    # Logging in again cancels a scheduled deletion: a token issued after the request
    # means a fresh sign-in (the app signs users out when they request deletion).
    if user.deletion_requested_at and claims.issued_at:
        from app.account import as_utc, restore_account

        if claims.issued_at > as_utc(user.deletion_requested_at).timestamp():
            restore_account(db, user)
    return user


def require_role(role: str):
    def dep(user: User = Depends(get_current_user)) -> User:
        if user.role != role:
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"{role} account required")
        return user

    return dep


require_worker = require_role("worker")
require_customer = require_role("customer")
