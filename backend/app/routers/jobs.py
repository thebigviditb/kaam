from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.deps import get_current_user, require_customer, require_worker
from app.models import Application, Job, User
from app.routers.workers import worker_out
from app.schemas import (
    ApplicationIn,
    ApplicationOut,
    ApplicationUpdate,
    JobIn,
    JobOut,
    JobUpdate,
)

router = APIRouter(tags=["jobs"])


def job_out(job: Job, viewer: User | None = None) -> JobOut:
    out = JobOut.model_validate(job)
    cp = job.customer.customer_profile if job.customer else None
    out.customer_name = cp.display_name if cp else ""
    out.application_count = len(job.applications)
    if viewer is not None and viewer.role == "worker":
        mine = next((a for a in job.applications if a.worker_id == viewer.id), None)
        out.my_application_status = mine.status if mine else None
    return out


def _load_jobs(db: Session):
    return db.query(Job).options(
        joinedload(Job.customer).joinedload(User.customer_profile),
        joinedload(Job.applications),
    )


def _filter_jobs(rows: list[Job], tags: list[str] | None, require_all: bool = False) -> list[Job]:
    if not tags:
        return rows
    wanted = set(tags)
    if require_all:
        return [r for r in rows if wanted <= set(r.tags or [])]
    return [r for r in rows if wanted & set(r.tags or [])]


@router.post("/jobs", response_model=JobOut, status_code=status.HTTP_201_CREATED)
def create_job(body: JobIn, user: User = Depends(require_customer), db: Session = Depends(get_db)):
    if "other" in body.tags and not body.other_tag_text:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "describe the 'other' task")
    job = Job(customer_id=user.id, **body.model_dump())
    db.add(job)
    db.commit()
    job = _load_jobs(db).filter(Job.id == job.id).one()
    return job_out(job, user)


@router.get("/jobs", response_model=list[JobOut])
def list_jobs(
    tags: list[str] | None = Query(default=None),
    city: str | None = None,
    min_pay: float | None = None,
    pay_type: str | None = None,
    q: str | None = None,
    status_: str = Query(default="open", alias="status"),
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = _load_jobs(db)
    if status_ != "all":
        query = query.filter(Job.status == status_)
    if city:
        query = query.filter(Job.city == city)
    if min_pay is not None:
        query = query.filter(Job.pay_amount >= min_pay)
    if pay_type:
        query = query.filter(Job.pay_type == pay_type)
    if q:
        like = f"%{q}%"
        query = query.filter(Job.title.ilike(like) | Job.description.ilike(like))
    rows = _filter_jobs(query.order_by(Job.created_at.desc()).all(), tags)
    return [job_out(j, user) for j in rows[offset : offset + limit]]


@router.get("/jobs/matching", response_model=list[JobOut])
def matching_jobs(user: User = Depends(require_worker), db: Session = Depends(get_db)):
    """Open jobs in the worker's city that overlap with their skill tags.

    This is the endpoint the voice agent will call ("what work is available for me?").
    """
    p = user.worker_profile
    if p is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "set up your worker profile first")
    rows = (
        _load_jobs(db)
        .filter(Job.status == "open", Job.city == p.city)
        .order_by(Job.created_at.desc())
        .all()
    )
    return [job_out(j, user) for j in _filter_jobs(rows, p.tags)]


@router.get("/jobs/mine", response_model=list[JobOut])
def my_jobs(user: User = Depends(require_customer), db: Session = Depends(get_db)):
    rows = _load_jobs(db).filter(Job.customer_id == user.id).order_by(Job.created_at.desc()).all()
    return [job_out(j, user) for j in rows]


@router.get("/jobs/{job_id}", response_model=JobOut)
def get_job(job_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    job = _load_jobs(db).filter(Job.id == job_id).one_or_none()
    if job is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "job not found")
    return job_out(job, user)


@router.patch("/jobs/{job_id}", response_model=JobOut)
def update_job(
    job_id: str,
    body: JobUpdate,
    user: User = Depends(require_customer),
    db: Session = Depends(get_db),
):
    job = _load_jobs(db).filter(Job.id == job_id).one_or_none()
    if job is None or job.customer_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "job not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(job, k, v)
    if "other" in job.tags and not job.other_tag_text:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "describe the 'other' task")
    db.commit()
    db.refresh(job)
    return job_out(job, user)


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(job_id: str, user: User = Depends(require_customer), db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if job is None or job.customer_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "job not found")
    db.delete(job)
    db.commit()


# ---- applications ----


def _app_out(a: Application, with_job: bool, with_worker: bool) -> ApplicationOut:
    out = ApplicationOut(
        id=a.id,
        job_id=a.job_id,
        worker_id=a.worker_id,
        message=a.message,
        status=a.status,
        created_at=a.created_at,
    )
    if with_job:
        out.job = job_out(a.job)
    if with_worker and a.worker.worker_profile is not None:
        out.worker = worker_out(a.worker.worker_profile, include_phone=True)
    return out


@router.post(
    "/jobs/{job_id}/apply", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED
)
def apply(
    job_id: str,
    body: ApplicationIn,
    user: User = Depends(require_worker),
    db: Session = Depends(get_db),
):
    job = db.get(Job, job_id)
    if job is None or job.status != "open":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "job not open")
    if user.worker_profile is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "set up your profile first")
    dup = (
        db.query(Application)
        .filter(Application.job_id == job_id, Application.worker_id == user.id)
        .one_or_none()
    )
    if dup:
        raise HTTPException(status.HTTP_409_CONFLICT, "already applied")
    a = Application(job_id=job_id, worker_id=user.id, message=body.message)
    db.add(a)
    db.commit()
    db.refresh(a)
    return _app_out(a, with_job=True, with_worker=False)


@router.get("/jobs/{job_id}/applications", response_model=list[ApplicationOut])
def job_applications(
    job_id: str, user: User = Depends(require_customer), db: Session = Depends(get_db)
):
    job = db.get(Job, job_id)
    if job is None or job.customer_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "job not found")
    rows = (
        db.query(Application)
        .options(joinedload(Application.worker).joinedload(User.worker_profile))
        .filter(Application.job_id == job_id)
        .order_by(Application.created_at.desc())
        .all()
    )
    return [_app_out(a, with_job=False, with_worker=True) for a in rows]


@router.get("/applications/me", response_model=list[ApplicationOut])
def my_applications(user: User = Depends(require_worker), db: Session = Depends(get_db)):
    rows = (
        db.query(Application)
        .options(joinedload(Application.job).joinedload(Job.customer))
        .filter(Application.worker_id == user.id)
        .order_by(Application.created_at.desc())
        .all()
    )
    return [_app_out(a, with_job=True, with_worker=False) for a in rows]


@router.patch("/applications/{application_id}", response_model=ApplicationOut)
def decide_application(
    application_id: str,
    body: ApplicationUpdate,
    user: User = Depends(require_customer),
    db: Session = Depends(get_db),
):
    a = db.get(Application, application_id)
    if a is None or a.job.customer_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "application not found")
    a.status = body.status
    if body.status == "accepted":
        a.job.status = "filled"
    db.commit()
    db.refresh(a)
    return _app_out(a, with_job=True, with_worker=True)
