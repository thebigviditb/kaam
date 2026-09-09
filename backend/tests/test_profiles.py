from conftest import CUSTOMER, WORKER


def test_worker_profile_roundtrip(client, worker):
    r = client.get("/workers/me", headers=WORKER)
    assert r.status_code == 200
    assert r.json()["tags"] == ["cooking", "cleaning"]
    assert r.json()["phone"] == "+14085551234"


def test_other_tag_requires_text(client, worker):
    body = {**worker, "tags": ["other"]}
    r = client.put("/workers/me", json=body, headers=WORKER)
    assert r.status_code == 422
    body["other_tag_text"] = "pooja prep"
    assert client.put("/workers/me", json=body, headers=WORKER).status_code == 200


def test_bad_tag_and_city(client, worker):
    assert (
        client.put("/workers/me", json={**worker, "tags": ["welding"]}, headers=WORKER).status_code
        == 422
    )
    assert (
        client.put("/workers/me", json={**worker, "city": "Delhi"}, headers=WORKER).status_code
        == 422
    )


def test_customer_cannot_edit_worker_profile(client, customer):
    r = client.put("/workers/me", json={"display_name": "x", "city": "Fremont"}, headers=CUSTOMER)
    assert r.status_code == 403


def test_list_workers_filters(client, worker, customer):
    assert len(client.get("/workers", headers=CUSTOMER).json()) == 1
    assert len(client.get("/workers?tags=cooking", headers=CUSTOMER).json()) == 1
    assert len(client.get("/workers?tags=childcare", headers=CUSTOMER).json()) == 0
    assert len(client.get("/workers?city=Oakland", headers=CUSTOMER).json()) == 0
    assert len(client.get("/workers?max_rate=20", headers=CUSTOMER).json()) == 0
    assert len(client.get("/workers?min_experience=5", headers=CUSTOMER).json()) == 1
    assert len(client.get("/workers?q=north+indian", headers=CUSTOMER).json()) == 1


def test_customer_sees_phone_other_worker_does_not(client, worker, customer):
    assert client.get("/workers", headers=CUSTOMER).json()[0]["phone"] == "+14085551234"
    client.post(
        "/me",
        json={"role": "worker", "phone": "+1"},
        headers={"Authorization": "Bearer dev:w2:w2@x.com"},
    )
    assert (
        client.get("/workers", headers={"Authorization": "Bearer dev:w2:w2@x.com"}).json()[0][
            "phone"
        ]
        is None
    )


def test_hidden_profile_not_listed(client, worker, customer):
    client.put("/workers/me", json={**worker, "is_visible": False}, headers=WORKER)
    assert client.get("/workers", headers=CUSTOMER).json() == []
    assert client.get(f"/workers/{worker['user_id']}", headers=CUSTOMER).status_code == 404
