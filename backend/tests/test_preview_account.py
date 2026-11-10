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
    app.dependency_overrides.pop(get_claims, None)


def login(sub: str, at: int):
    """Requests from now on carry a Cognito-style token for `sub` issued at second `at`."""
    claims = Claims(sub=sub, email=None, issued_at=int(now().timestamp()) + at)
    app.dependency_overrides[get_claims] = lambda: claims


def make_preview_worker(client):
    assert client.post("/me", json={"role": "worker", "phone": PREVIEW}).status_code == 201
    assert client.put("/workers/me", json=WORKER_PROFILE).status_code == 200


def test_new_login_starts_preview_account_over(client, customer):
    login("preview-1", at=0)
    make_preview_worker(client)
    assert client.get("/me").json()["onboarded"] is True

    login("preview-1", at=60)  # a later sign-in
    assert client.get("/me").status_code == 404
    # Gone for everyone else too, so households don't see stale preview profiles.
    app.dependency_overrides.pop(get_claims)
    assert client.get("/workers", headers=CUSTOMER).json() == []

    # Registering again in that session works, lands in onboarding, and is not reset again.
    login("preview-1", at=60)
    assert client.post("/me", json={"role": "customer", "phone": PREVIEW}).status_code == 201
    for _ in range(3):
        me = client.get("/me").json()
        assert me["role"] == "customer" and me["onboarded"] is False


def test_same_session_keeps_preview_account(client):
    login("preview-1", at=0)
    make_preview_worker(client)
    for _ in range(3):
        assert client.get("/me").json()["onboarded"] is True


def test_laptop_to_phone_handoff_keeps_preview_account(client):
    login("preview-1", at=0)  # the laptop
    make_preview_worker(client)
    assert client.put("/me", json={"install_pending": True}).status_code == 200

    login("preview-1", at=60)  # the phone's sign-in: kept, lands on the install step
    me = client.get("/me").json()
    assert me["onboarded"] is True and me["install_pending"] is True
    client.put("/me", json={"install_pending": False})  # skipped on the phone
    for _ in range(3):  # the phone carries on in the same session
        assert client.get("/me").json()["onboarded"] is True

    login("preview-1", at=0)  # the laptop's older session polls: no reset
    assert client.get("/me").json()["install_pending"] is False

    login("preview-1", at=120)  # any later sign-in starts over again
    assert client.get("/me").status_code == 404


def test_other_phones_are_never_reset(client, worker):
    login("worker-1", at=3600)
    assert client.get("/me").json()["onboarded"] is True
    login("worker-1", at=7200)
    assert client.get("/me").json()["onboarded"] is True


def test_dev_tokens_without_iat_do_not_reset(client):
    headers = {"Authorization": "Bearer dev:preview-2:p@example.com"}
    client.post("/me", json={"role": "worker", "phone": PREVIEW}, headers=headers)
    assert client.get("/me", headers=headers).status_code == 200
    assert client.get("/me", headers=WORKER).status_code == 404  # unrelated, never registered
