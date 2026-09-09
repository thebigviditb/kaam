from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import Claims, get_claims
from app.config import Settings, get_settings
from app.constants import CITIES, PAY_TYPES, TAGS
from app.db import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import MetaOut, UserCreate, UserOut, UserUpdate

router = APIRouter(tags=["me"])


@router.get("/meta", response_model=MetaOut)
def meta():
    return MetaOut(tags=TAGS, cities=CITIES, pay_types=PAY_TYPES)


@router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)):
    return user


@router.post("/me", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register_me(
    body: UserCreate,
    claims: Claims = Depends(get_claims),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    """Create the app-side user record after Cognito sign-up. Idempotent per Cognito sub."""
    existing = db.query(User).filter(User.cognito_sub == claims.sub).one_or_none()
    if existing:
        return existing
    if body.role == "worker" and not body.phone:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "workers must provide a phone")
    user = User(
        cognito_sub=claims.sub,
        email=claims.resolve_email(settings),
        role=body.role,
        phone=body.phone,
        preferred_language=body.preferred_language,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/me", response_model=UserOut)
def update_me(
    body: UserUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    if body.phone is not None:
        user.phone = body.phone
    if body.preferred_language is not None:
        user.preferred_language = body.preferred_language
    if user.role == "worker" and not user.phone:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "workers must have a phone")
    db.commit()
    db.refresh(user)
    return user
