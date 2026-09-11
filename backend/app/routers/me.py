from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import Claims, get_claims
from app.config import Settings, get_settings
from app.constants import CITIES, DAYS, PAY_TYPES, REPORT_REASONS, START_TIMINGS, TAGS, TIMES
from app.db import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import MetaOut, UserCreate, UserOut, UserUpdate

router = APIRouter(tags=["me"])


def user_out(user: User) -> UserOut:
    out = UserOut.model_validate(user)
    out.onboarded = (
        user.worker_profile is not None
        if user.role == "worker"
        else user.customer_profile is not None
    )
    return out


@router.get("/meta", response_model=MetaOut)
def meta():
    return MetaOut(
        tags=TAGS,
        cities=CITIES,
        pay_types=PAY_TYPES,
        days=DAYS,
        times=TIMES,
        start_timings=START_TIMINGS,
        report_reasons=REPORT_REASONS,
    )


@router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)):
    return user_out(user)


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
        return user_out(existing)
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
    return user_out(user)


@router.put("/me", response_model=UserOut)
def update_me(
    body: UserUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    if body.phone is not None:
        user.phone = body.phone
    if body.preferred_language is not None:
        user.preferred_language = body.preferred_language
    if not user.phone:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "phone is required")
    db.commit()
    db.refresh(user)
    return user_out(user)
