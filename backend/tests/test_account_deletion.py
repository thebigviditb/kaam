from datetime import timedelta
from unittest.mock import patch

from conftest import CUSTOMER, WORKER

from app.models import User, now


def test_request_hides_profile_and_restore_unhides(client, worker, customer):
    r = client.post("/me/delete", headers=WORKER)
    assert r.status_code == 200 and r.json()["deletion_scheduled_for"] is not None
    # hidden from the household
    assert client.get("/workers/matching", headers=CUSTOMER).json() == []
    assert client.get("/workers", headers=CUSTOMER).json() == []
    # still scheduled on the next request with the same (dev) token
    assert client.get("/me", headers=WORKER).json()["deletion_scheduled_for"] is not None
    # explicit restore
    r = client.post("/me/restore", headers=WORKER)
    assert r.json()["deletion_scheduled_for"] is None
    assert len(client.get("/workers/matching", headers=CUSTOMER).json()) == 1


def test_fresh_login_token_cancels_deletion(client, worker, customer):
    client.post("/me/delete", headers=WORKER)
    from app.auth import Claims, get_claims
    from app.main import app

    fresh = Claims(sub="worker-1", email="w@example.com", issued_at=int(now().timestamp()) + 60)
    app.dependency_overrides[get_claims] = lambda: fresh
    try:
        assert client.get("/me").json()["deletion_scheduled_for"] is None
    finally:
        app.dependency_overrides.pop(get_claims)


def test_purge_after_grace_period(client, worker, customer):
    cid = client.post(
        "/connections", json={"customer_id": customer["user_id"]}, headers=WORKER
    ).json()["id"]
    client.patch(f"/connections/{cid}", json={"status": "accepted"}, headers=CUSTOMER)
    with patch("app.translate.translate", return_value=None):
        client.post(f"/connections/{cid}/messages", json={"body": "hi"}, headers=WORKER)
    client.post(
        "/reports",
        json={"reported_user_id": worker["user_id"], "reason": "harassment"},
        headers=CUSTOMER,
    )
    client.post("/me/delete", headers=WORKER)

    from app.db import get_db
    from app.main import app

    db = next(app.dependency_overrides[get_db]())
    u = db.query(User).filter(User.id == worker["user_id"]).one()
    u.deletion_requested_at = now() - timedelta(days=31)
    db.commit()

    # cron endpoint requires the secret
    assert client.get("/internal/purge-deleted-accounts").status_code == 401
    from app.config import Settings, get_settings

    app.dependency_overrides[get_settings] = lambda: Settings(cron_secret="s3cret")
    try:
        with patch("app.account._delete_cognito_user") as del_cog:
            r = client.get(
                "/internal/purge-deleted-accounts", headers={"Authorization": "Bearer s3cret"}
            )
    finally:
        app.dependency_overrides.pop(get_settings)
    assert r.status_code == 200 and r.json()["purged"] == [worker["user_id"]]
    del_cog.assert_called_once_with("worker-1")
    assert client.get("/me", headers=WORKER).status_code == 404
    assert client.get("/connections/me", headers=CUSTOMER).json() == []
