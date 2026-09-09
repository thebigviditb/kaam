from unittest.mock import patch

from conftest import WORKER


def test_presign_validates(client, worker):
    r = client.post(
        "/media/presign",
        json={"kind": "image", "content_type": "text/plain", "size_bytes": 10},
        headers=WORKER,
    )
    assert r.status_code == 422
    r = client.post(
        "/media/presign",
        json={"kind": "image", "content_type": "image/png", "size_bytes": 99_000_000},
        headers=WORKER,
    )
    assert r.status_code == 422


def test_presign_register_delete(client, worker):
    with (
        patch("app.storage.presign_put", return_value="https://s3/put"),
        patch("app.storage.delete_object") as delete_object,
    ):
        r = client.post(
            "/media/presign",
            json={"kind": "image", "content_type": "image/png", "size_bytes": 10},
            headers=WORKER,
        )
        assert r.status_code == 200, r.text
        key = r.json()["s3_key"]
        assert key.startswith(f"users/{worker['user_id']}/images/")

        r = client.post(
            "/media",
            json={"kind": "image", "s3_key": key, "content_type": "image/png"},
            headers=WORKER,
        )
        assert r.status_code == 201
        media_id = r.json()["id"]
        assert len(client.get("/workers/me", headers=WORKER).json()["media"]) == 1

        r = client.post(
            "/media",
            json={
                "kind": "image",
                "s3_key": "users/someone-else/x.png",
                "content_type": "image/png",
            },
            headers=WORKER,
        )
        assert r.status_code == 403

        assert client.delete(f"/media/{media_id}", headers=WORKER).status_code == 204
        delete_object.assert_called_once_with(key)
        assert client.get("/media", headers=WORKER).json() == []
