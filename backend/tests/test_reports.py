from conftest import CUSTOMER, WORKER


def test_report_from_profile_and_chat(client, worker, customer):
    r = client.post(
        "/reports",
        json={"reported_user_id": worker["user_id"], "reason": "fake_profile"},
        headers=CUSTOMER,
    )
    assert r.status_code == 201 and r.json()["id"]

    cid = client.post(
        "/connections", json={"customer_id": customer["user_id"]}, headers=WORKER
    ).json()["id"]
    r = client.post(
        "/reports",
        json={
            "reported_user_id": customer["user_id"],
            "connection_id": cid,
            "reason": "other",
            "description": "rude",
        },
        headers=WORKER,
    )
    assert r.status_code == 201


def test_report_validation(client, worker, customer):
    assert (
        client.post(
            "/reports",
            json={"reported_user_id": worker["user_id"], "reason": "other"},
            headers=CUSTOMER,
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/reports",
            json={"reported_user_id": customer["user_id"], "reason": "harassment"},
            headers=CUSTOMER,
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/reports", json={"reported_user_id": "nope", "reason": "harassment"}, headers=CUSTOMER
        ).status_code
        == 404
    )
    assert (
        client.post(
            "/reports",
            json={
                "reported_user_id": worker["user_id"],
                "connection_id": "nope",
                "reason": "harassment",
            },
            headers=CUSTOMER,
        ).status_code
        == 404
    )
    assert (
        client.post(
            "/reports",
            json={"reported_user_id": worker["user_id"], "reason": "bogus"},
            headers=CUSTOMER,
        ).status_code
        == 422
    )
    assert "other" in client.get("/meta").json()["report_reasons"]
