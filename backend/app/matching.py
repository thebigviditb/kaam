"""Shared matching / filtering helpers. Tags, days and times are JSON lists, so the
overlap logic runs in Python after a coarse SQL filter."""

from app.models import CustomerProfile, WorkerProfile

Profile = WorkerProfile | CustomerProfile


def overlap(a: list[str] | None, b: list[str] | None) -> int:
    return len(set(a or []) & set(b or []))


def match_score(worker: WorkerProfile, customer: CustomerProfile) -> int:
    """0 when nothing lines up. Tag overlap weighs most; availability overlap adds."""
    tags = overlap(worker.tags, customer.tags)
    if tags == 0:
        return 0
    return (
        tags * 10 + overlap(worker.days, customer.days) * 2 + overlap(worker.times, customer.times)
    )


def filter_lists(
    rows: list[Profile],
    tags: list[str] | None,
    days: list[str] | None,
    times: list[str] | None,
) -> list[Profile]:
    out = rows
    if tags:
        out = [r for r in out if overlap(r.tags, tags)]
    if days:
        out = [r for r in out if overlap(r.days, days)]
    if times:
        out = [r for r in out if overlap(r.times, times)]
    return out
