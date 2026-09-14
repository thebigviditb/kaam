from unittest.mock import patch

from conftest import CUSTOMER, WORKER

from app.translate import Translation


def _accepted(client, worker, customer):
    cid = client.post(
        "/connections", json={"customer_id": customer["user_id"]}, headers=WORKER
    ).json()["id"]
    client.patch(f"/connections/{cid}", json={"status": "accepted"}, headers=CUSTOMER)
    return cid


def test_translated_for_other_language_viewer(client, worker, customer):
    cid = _accepted(client, worker, customer)
    client.put("/me", json={"preferred_language": "hi"}, headers=WORKER)
    fake = Translation(lang="en", en="Can you start Monday?", hi="क्या आप सोमवार से शुरू कर सकती हैं?")
    with patch("app.translate.translate", return_value=fake):
        r = client.post(
            f"/connections/{cid}/messages", json={"body": "Can you start Monday?"}, headers=CUSTOMER
        )
    assert r.status_code == 201
    assert r.json()["lang"] == "en" and r.json()["translated_body"] is None  # sender sees own text

    # Hindi-preferring worker gets the Hindi rendering
    msgs = client.get(f"/connections/{cid}/messages", headers=WORKER).json()
    assert msgs[0]["translated_body"] == fake.hi
    # ...unless they ask for English explicitly
    msgs = client.get(f"/connections/{cid}/messages?lang=en", headers=WORKER).json()
    assert msgs[0]["translated_body"] is None
    # connection preview also translated
    assert (
        client.get("/connections/me", headers=WORKER).json()[0]["last_message"]["translated_body"]
        == fake.hi
    )
    assert (
        client.get("/connections/me?lang=en", headers=WORKER).json()[0]["last_message"][
            "translated_body"
        ]
        is None
    )


def test_translation_failure_does_not_block_send(client, worker, customer):
    cid = _accepted(client, worker, customer)
    with patch("app.translate.translate", return_value=None):
        r = client.post(f"/connections/{cid}/messages", json={"body": "namaste"}, headers=WORKER)
    assert r.status_code == 201 and r.json()["lang"] is None
    assert (
        client.get(f"/connections/{cid}/messages", headers=CUSTOMER).json()[0]["translated_body"]
        is None
    )


def test_no_key_means_no_translation():
    from app import translate
    from app.config import Settings

    with patch("app.translate.get_settings", return_value=Settings(anthropic_api_key="")):
        assert translate.translate("hello") is None
