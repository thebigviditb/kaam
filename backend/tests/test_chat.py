from conftest import CUSTOMER, WORKER, WORKER2


def _accepted(client, worker, customer):
    cid = client.post(
        "/connections", json={"customer_id": customer["user_id"]}, headers=WORKER
    ).json()["id"]
    client.patch(f"/connections/{cid}", json={"status": "accepted"}, headers=CUSTOMER)
    return cid


def test_chat_requires_acceptance(client, worker, customer):
    cid = client.post(
        "/connections", json={"customer_id": customer["user_id"]}, headers=WORKER
    ).json()["id"]
    assert client.get(f"/connections/{cid}/messages", headers=WORKER).status_code == 403
    assert (
        client.post(f"/connections/{cid}/messages", json={"body": "hi"}, headers=WORKER).status_code
        == 403
    )


def test_chat_roundtrip_unread_and_polling(client, worker, customer):
    cid = _accepted(client, worker, customer)
    r = client.post(f"/connections/{cid}/messages", json={"body": "Namaste"}, headers=CUSTOMER)
    assert r.status_code == 201 and r.json()["sender_id"] == customer["user_id"]
    first_id = r.json()["id"]

    # worker sees 1 unread + last message on the connection list
    mine = client.get("/connections/me", headers=WORKER).json()[0]
    assert mine["unread_count"] == 1 and mine["last_message"]["body"] == "Namaste"
    # customer (sender) has 0 unread
    assert client.get("/connections/me", headers=CUSTOMER).json()[0]["unread_count"] == 0

    msgs = client.get(f"/connections/{cid}/messages", headers=WORKER).json()
    assert [m["body"] for m in msgs] == ["Namaste"]

    assert client.post(f"/connections/{cid}/read", headers=WORKER).status_code == 204
    assert client.get("/connections/me", headers=WORKER).json()[0]["unread_count"] == 0

    client.post(f"/connections/{cid}/messages", json={"body": "Hello ji"}, headers=WORKER)
    newer = client.get(f"/connections/{cid}/messages?after={first_id}", headers=CUSTOMER).json()
    assert [m["body"] for m in newer] == ["Hello ji"]
    assert client.get("/connections/me", headers=CUSTOMER).json()[0]["unread_count"] == 1


def test_chat_is_private(client, worker, customer):
    cid = _accepted(client, worker, customer)
    client.post("/me", json={"role": "worker", "phone": "+15550000002"}, headers=WORKER2)
    assert client.get(f"/connections/{cid}/messages", headers=WORKER2).status_code == 404
    assert (
        client.post(f"/connections/{cid}/messages", json={"body": "x"}, headers=WORKER2).status_code
        == 404
    )


def test_empty_body_rejected(client, worker, customer):
    cid = _accepted(client, worker, customer)
    assert (
        client.post(f"/connections/{cid}/messages", json={"body": ""}, headers=WORKER).status_code
        == 422
    )
