import pytest
from conftest import CUSTOMER, WORKER, WORKER_PROFILE

from app.auth import Claims, get_claims
from app.config import get_settings
from app.main import app
from app.models import now

PREVIEW = "+15550100199"


@pytest.fixture(autouse=True)
def preview_phone(monkeypatch):
    monkeypatch.setenv("PREVIEW_PHONES", PREVIEW)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def login(sub: str, seconds_from_now: int):
    """Requests as `sub` with a Cognito-style token issued `seconds_from_now`."""
    claims = Claims(sub=sub, email=None, issued_at=int(now().timestamp()) + seconds_from_now)
    app.dependency_overrides[get_claims] = lambda: claims


@pytest.fixture
def logout():
    yield
    app.dependency_overrides.pop(get_claims, None)


def make_preview_worker(client):
    assert client.post("/me", json={"role": "worker", "phone": PREVIEW}).status_code == 201
    assert client.put("/workers/me", json=WORKER_PROFILE).status_code == 200


def test_fresh_login_starts_preview_account_over(client, customer, logout):
    login("preview-1", seconds_from_now=-60)  # token from before the account existed
    make_preview_worker(client)
    assert client.get("/me").json()["onboarded"] is True

    login("preview-1", seconds_from_now=60)  # a later sign-in
    r = client.get("/me")
    assert r.status_code == 404
    # Gone for everyone else too, so households don't see stale preview profiles.
    app.dependency_overrides.pop(get_claims)
    assert client.get("/workers", headers=CUSTOMER).json() == []

    # Registering again works and lands in onboarding; the same token does not reset it again.
    login("preview-1", seconds_from_now=60)
    assert client.post("/me", json={"role": "customer", "phone": PREVIEW}).status_code == 201
    login("preview-1", seconds_from_now=-1)
    me = client.get("/me").json()
    assert me["role"] == "customer" and me["onboarded"] is False


def test_same_session_keeps_preview_account(client, logout):
    login("preview-1", seconds_from_now=-60)
    make_preview_worker(client)
    for _ in range(3):
        assert client.get("/me").json()["onboarded"] is True


def test_other_phones_are_never_reset(client, worker, logout):
    login("worker-1", seconds_from_now=3600)
    assert client.get("/me").json()["onboarded"] is True


def test_dev_tokens_without_iat_do_not_reset(client):
    headers = {"Authorization": "Bearer dev:preview-2:p@example.com"}
    client.post("/me", json={"role": "worker", "phone": PREVIEW}, headers=headers)
    assert client.get("/me", headers=headers).status_code == 200
    assert client.get("/me", headers=WORKER).status_code == 404  # unrelated, never registered
