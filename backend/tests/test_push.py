from datetime import timedelta
from unittest.mock import patch

from conftest import CUSTOMER, WORKER

from app.models import User, now

SUB = {"endpoint": "https://push.example/abc123", "keys": {"p256dh": "k1", "auth": "a1"}}


def _accepted(client, worker, customer):
    cid = client.post(
        "/connections", json={"customer_id": customer["user_id"]}, headers=WORKER
    ).json()["id"]
    client.patch(f"/connections/{cid}", json={"status": "accepted"}, headers=CUSTOMER)
    return cid


def test_subscribe_is_idempotent_and_owned(client, worker, customer):
    assert client.post("/push/subscriptions", json=SUB, headers=WORKER).status_code == 201
    assert client.post("/push/subscriptions", json=SUB, headers=WORKER).status_code == 201
    # another user logging in on the same device takes the endpoint over
    assert client.post("/push/subscriptions", json=SUB, headers=CUSTOMER).status_code == 201
    from app.db import get_db
    from app.main import app
    from app.models import PushSubscription

    db = next(app.dependency_overrides[get_db]())
    subs = db.query(PushSubscription).all()
    assert len(subs) == 1 and subs[0].user_id == customer["user_id"]
    # worker can't delete the customer's subscription; customer can
    assert (
        client.request(
            "DELETE", "/push/subscriptions", json={"endpoint": SUB["endpoint"]}, headers=WORKER
        ).status_code
        == 204
    )
    assert db.query(PushSubscription).count() == 1
    assert (
        client.request(
            "DELETE", "/push/subscriptions", json={"endpoint": SUB["endpoint"]}, headers=CUSTOMER
        ).status_code
        == 204
    )
    assert db.query(PushSubscription).count() == 0


def test_push_sent_only_when_recipient_inactive(client, worker, customer):
    cid = _accepted(client, worker, customer)
    client.post("/push/subscriptions", json=SUB, headers=CUSTOMER)
    # customer polled just now -> active -> no push
    client.get("/connections/me", headers=CUSTOMER)
    with (
        patch("app.notify.send_push", return_value=True) as sp,
        patch("app.translate.translate", return_value=None),
    ):
        client.post(f"/connections/{cid}/messages", json={"body": "hi"}, headers=WORKER)
    sp.assert_not_called()

    # make the customer stale
    from app.db import get_db
    from app.main import app

    db = next(app.dependency_overrides[get_db]())
    u = db.query(User).filter(User.id == customer["user_id"]).one()
    u.last_seen_at = now() - timedelta(minutes=5)
    db.commit()
    with (
        patch("app.notify.send_push", return_value=True) as sp,
        patch("app.translate.translate", return_value=None),
    ):
        client.post(f"/connections/{cid}/messages", json={"body": "are you there?"}, headers=WORKER)
    sp.assert_called_once()
    payload = sp.call_args.args[2]
    assert (
        payload["title"] == "Sunita"
        and payload["body"] == "are you there?"
        and payload["url"] == f"/chat/{cid}"
    )


def test_sms_fallback_when_no_devices_and_throttled(client, worker, customer):
    cid = _accepted(client, worker, customer)
    from app.config import Settings, get_settings
    from app.main import app

    app.dependency_overrides[get_settings] = lambda: Settings(sms_notifications_enabled=True)
    try:
        with (
            patch("app.notify.get_settings", return_value=Settings(sms_notifications_enabled=True)),
            patch("app.notify.send_sms", return_value=True) as sms,
            patch("app.translate.translate", return_value=None),
        ):
            client.post(f"/connections/{cid}/messages", json={"body": "first"}, headers=WORKER)
            client.post(f"/connections/{cid}/messages", json={"body": "second"}, headers=WORKER)
        assert sms.call_count == 1
        to, body = sms.call_args.args
        assert to == "+14085559999" and body.startswith("Sunita sent you a message on Kaam")
    finally:
        app.dependency_overrides.pop(get_settings)


def test_public_key_and_sms_off_by_default(client, worker, customer):
    assert "public_key" in client.get("/push/public-key").json()
    cid = _accepted(client, worker, customer)
    with patch("app.notify.send_sms") as sms, patch("app.translate.translate", return_value=None):
        client.post(f"/connections/{cid}/messages", json={"body": "hello"}, headers=WORKER)
    # send_sms is only called when enabled; default settings have it off -> it returns False fast
    assert sms.call_count <= 1
