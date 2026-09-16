"""Shared matching / filtering helpers. Tags, days, times and cities are JSON lists, so the
overlap logic runs in Python after a coarse SQL filter.

Nobody is excluded from matching: exact matches (work overlaps, city covered, availability
overlaps) rank first; everyone else follows as a partial match, best fit first."""

from app.models import CustomerProfile, WorkerProfile

Profile = WorkerProfile | CustomerProfile


def overlap(a: list[str] | None, b: list[str] | None) -> int:
    return len(set(a or []) & set(b or []))


def city_covered(worker: WorkerProfile, customer: CustomerProfile) -> bool:
    return customer.city in set(worker.work_cities or []) | {worker.city}


def match_score(worker: WorkerProfile, customer: CustomerProfile) -> int:
    """Higher is better. Tags weigh most, then city coverage, then availability."""
    return (
        overlap(worker.tags, customer.tags) * 10
        + (15 if city_covered(worker, customer) else 0)
        + overlap(worker.days, customer.days) * 2
        + overlap(worker.times, customer.times)
    )


def match_level(worker: WorkerProfile, customer: CustomerProfile) -> str:
    exact = (
        overlap(worker.tags, customer.tags) > 0
        and city_covered(worker, customer)
        and overlap(worker.days, customer.days) > 0
        and overlap(worker.times, customer.times) > 0
    )
    return "exact" if exact else "partial"


def rank(pairs):
    """pairs: iterable of (worker, customer, row). Exact first, then by score desc."""
    scored = [(match_level(w, c), match_score(w, c), r) for w, c, r in pairs]
    return sorted(scored, key=lambda s: (s[0] != "exact", -s[1]))


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
