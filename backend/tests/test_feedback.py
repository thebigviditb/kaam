from conftest import WORKER


def test_feedback(client, worker):
    r = client.post(
        "/feedback",
        json={"message": "Love it, but the map is confusing", "category": "idea"},
        headers=WORKER,
    )
    assert r.status_code == 201 and r.json()["id"]
    assert client.post("/feedback", json={"message": "hi"}, headers=WORKER).status_code == 422
    assert client.post("/feedback", json={"message": "no auth"}).status_code == 401
