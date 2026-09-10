from conftest import CUSTOMER, CUSTOMER2, CUSTOMER_PROFILE, WORKER, WORKER2


def test_worker_reaches_out_and_customer_accepts(client, worker, customer):
    r = client.post(
        "/connections",
        json={"customer_id": customer["user_id"], "message": "I can start Monday"},
        headers=WORKER,
    )
    assert r.status_code == 201, r.text
    cid = r.json()["id"]
    assert r.json()["initiated_by"] == "worker"
    assert r.json()["customer"]["phone"] is None  # not yet accepted

    # duplicate
    assert (
        client.post(
            "/connections", json={"customer_id": customer["user_id"]}, headers=WORKER
        ).status_code
        == 409
    )
    # browsing shows the pending state
    assert client.get("/customers", headers=WORKER).json()[0]["connection"]["status"] == "pending"
    assert (
        client.get("/workers/matching", headers=CUSTOMER).json()[0]["connection"]["status"]
        == "pending"
    )

    # initiator can't decide
    assert (
        client.patch(f"/connections/{cid}", json={"status": "accepted"}, headers=WORKER).status_code
        == 403
    )

    mine = client.get("/connections/me", headers=CUSTOMER).json()
    assert len(mine) == 1 and mine[0]["worker"]["display_name"] == "Sunita"
    assert mine[0]["worker"]["phone"] is None

    r = client.patch(f"/connections/{cid}", json={"status": "accepted"}, headers=CUSTOMER)
    assert r.status_code == 200 and r.json()["status"] == "accepted"
    assert r.json()["worker"]["phone"] == "+14085551234"

    # both sides now see each other's phone
    assert (
        client.get("/connections/me", headers=WORKER).json()[0]["customer"]["phone"]
        == "+14085559999"
    )
    assert (
        client.get(f"/workers/{worker['user_id']}", headers=CUSTOMER).json()["phone"]
        == "+14085551234"
    )


def test_customer_invites_worker(client, worker, customer):
    r = client.post(
        "/connections",
        json={"worker_id": worker["user_id"], "message": "Are you free?"},
        headers=CUSTOMER,
    )
    assert r.status_code == 201, r.text
    cid = r.json()["id"]
    assert r.json()["initiated_by"] == "customer"
    r = client.patch(f"/connections/{cid}", json={"status": "declined"}, headers=WORKER)
    assert r.status_code == 200 and r.json()["status"] == "declined"
    assert client.get(f"/customers/{customer['user_id']}", headers=WORKER).json()["phone"] is None


def test_requires_onboarding_and_valid_target(client, customer):
    client.post("/me", json={"role": "worker", "phone": "+15550000002"}, headers=WORKER2)
    assert (
        client.post(
            "/connections", json={"customer_id": customer["user_id"]}, headers=WORKER2
        ).status_code
        == 422
    )
    assert (
        client.post("/connections", json={"worker_id": "nope"}, headers=CUSTOMER).status_code == 404
    )
    assert (
        client.post("/connections", json={"customer_id": "x"}, headers=CUSTOMER).status_code == 422
    )


def test_withdraw_and_isolation(client, worker, customer):
    cid = client.post(
        "/connections", json={"customer_id": customer["user_id"]}, headers=WORKER
    ).json()["id"]
    client.post("/me", json={"role": "customer", "phone": "+15550000003"}, headers=CUSTOMER2)
    client.put("/customers/me", json=CUSTOMER_PROFILE, headers=CUSTOMER2)
    assert (
        client.patch(
            f"/connections/{cid}", json={"status": "accepted"}, headers=CUSTOMER2
        ).status_code
        == 404
    )
    assert client.delete(f"/connections/{cid}", headers=CUSTOMER2).status_code == 404
    assert client.delete(f"/connections/{cid}", headers=WORKER).status_code == 204
    assert client.get("/connections/me", headers=CUSTOMER).json() == []
