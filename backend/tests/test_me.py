from conftest import CUSTOMER, WORKER


def test_unauthenticated(client):
    assert client.get("/me").status_code == 401


def test_unregistered(client):
    assert client.get("/me", headers=WORKER).status_code == 404


def test_phone_required(client):
    assert client.post("/me", json={"role": "worker"}, headers=WORKER).status_code == 422
    assert client.post("/me", json={"role": "customer"}, headers=CUSTOMER).status_code == 422


def test_register_is_idempotent(client):
    r1 = client.post("/me", json={"role": "customer", "phone": "+15551234567"}, headers=CUSTOMER)
    r2 = client.post("/me", json={"role": "worker", "phone": "+15550000000"}, headers=CUSTOMER)
    assert r1.status_code == 201 and r2.status_code == 201
    assert r2.json()["role"] == "customer"
    assert r2.json()["email"] == "customer-1@example.com"
    assert r2.json()["onboarded"] is False


def test_onboarded_flag(client, customer):
    assert client.get("/me", headers=CUSTOMER).json()["onboarded"] is True


def test_update_language(client, customer):
    r = client.put("/me", json={"preferred_language": "hi"}, headers=CUSTOMER)
    assert r.status_code == 200
    assert r.json()["preferred_language"] == "hi"


def test_meta(client):
    m = client.get("/meta").json()
    assert "cooking" in m["tags"] and "other" in m["tags"]
    assert "Fremont" in m["cities"]
    assert m["days"][0] == "mon" and "morning" in m["times"] and "asap" in m["start_timings"]


def test_referral_code_and_ref(client):
    from conftest import WORKER2

    a = client.post(
        "/me", json={"role": "customer", "phone": "+15551234567"}, headers=CUSTOMER
    ).json()
    assert len(a["referral_code"]) == 7
    b = client.post(
        "/me",
        json={"role": "worker", "phone": "+15550000002", "ref": a["referral_code"].lower()},
        headers=WORKER,
    ).json()
    assert b["referral_code"] != a["referral_code"]
    # unknown code is ignored, not an error
    r = client.post(
        "/me", json={"role": "worker", "phone": "+15550000003", "ref": "NOPE123"}, headers=WORKER2
    )
    assert r.status_code == 201
    from app.db import get_db
    from app.main import app
    from app.models import User

    db = next(app.dependency_overrides[get_db]())
    assert db.query(User).filter(User.id == b["id"]).one().referred_by_id == a["id"]
    assert db.query(User).filter(User.id == r.json()["id"]).one().referred_by_id is None
