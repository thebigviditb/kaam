from conftest import CUSTOMER, WORKER


def test_unauthenticated(client):
    assert client.get("/me").status_code == 401


def test_unregistered(client):
    assert client.get("/me", headers=WORKER).status_code == 404


def test_worker_needs_phone(client):
    r = client.post("/me", json={"role": "worker"}, headers=WORKER)
    assert r.status_code == 422


def test_register_is_idempotent(client):
    r1 = client.post("/me", json={"role": "customer"}, headers=CUSTOMER)
    r2 = client.post("/me", json={"role": "worker", "phone": "x"}, headers=CUSTOMER)
    assert r1.status_code == 201 and r2.status_code == 201
    assert r2.json()["role"] == "customer"
    assert r2.json()["email"] == "customer-1@example.com"


def test_update_language(client, customer):
    r = client.put("/me", json={"preferred_language": "hi"}, headers=CUSTOMER)
    assert r.status_code == 200
    assert r.json()["preferred_language"] == "hi"


def test_meta(client):
    m = client.get("/meta").json()
    assert "cooking" in m["tags"] and "other" in m["tags"]
    assert "Fremont" in m["cities"]
