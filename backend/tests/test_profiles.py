from conftest import CUSTOMER, CUSTOMER_PROFILE, WORKER, WORKER2, WORKER_PROFILE


def test_worker_profile_roundtrip(client, worker):
    r = client.get("/workers/me", headers=WORKER)
    assert r.status_code == 200
    assert r.json()["tags"] == ["cooking", "cleaning"]
    assert r.json()["days"] == ["mon", "tue", "wed", "thu", "fri"]
    assert r.json()["phone"] == "+14085551234"


def test_other_tag_requires_text(client, worker, customer):
    assert (
        client.put(
            "/workers/me", json={**WORKER_PROFILE, "tags": ["other"]}, headers=WORKER
        ).status_code
        == 422
    )
    assert (
        client.put(
            "/workers/me",
            json={**WORKER_PROFILE, "tags": ["other"], "other_tag_text": "pooja prep"},
            headers=WORKER,
        ).status_code
        == 200
    )
    assert (
        client.put(
            "/customers/me", json={**CUSTOMER_PROFILE, "tags": ["other"]}, headers=CUSTOMER
        ).status_code
        == 422
    )


def test_validation(client, worker, customer):
    assert (
        client.put(
            "/workers/me", json={**WORKER_PROFILE, "tags": ["welding"]}, headers=WORKER
        ).status_code
        == 422
    )
    assert (
        client.put(
            "/workers/me", json={**WORKER_PROFILE, "days": ["someday"]}, headers=WORKER
        ).status_code
        == 422
    )
    assert (
        client.put("/workers/me", json={**WORKER_PROFILE, "days": []}, headers=WORKER).status_code
        == 422
    )
    assert (
        client.put(
            "/customers/me", json={**CUSTOMER_PROFILE, "city": "Delhi"}, headers=CUSTOMER
        ).status_code
        == 422
    )
    assert (
        client.put(
            "/customers/me",
            json={**CUSTOMER_PROFILE, "start_timing": "yesterday"},
            headers=CUSTOMER,
        ).status_code
        == 422
    )


def test_role_enforcement(client, customer, worker):
    assert client.put("/workers/me", json=WORKER_PROFILE, headers=CUSTOMER).status_code == 403
    assert client.put("/customers/me", json=CUSTOMER_PROFILE, headers=WORKER).status_code == 403
    assert client.get("/workers/matching", headers=WORKER).status_code == 403
    assert client.get("/customers/matching", headers=CUSTOMER).status_code == 403


def test_list_workers_filters(client, worker, customer):
    n = lambda qs: len(client.get(f"/workers?{qs}", headers=CUSTOMER).json())  # noqa: E731
    assert n("") == 1
    assert n("tags=cooking") == 1
    assert n("tags=childcare") == 0
    assert n("days=sat") == 0
    assert n("days=mon&days=sat") == 1
    assert n("times=evening") == 0
    assert n("max_rate=20") == 0
    assert n("min_experience=5") == 1
    assert n("q=north+indian") == 1


def test_list_customers_filters(client, worker, customer):
    n = lambda qs: len(client.get(f"/customers?{qs}", headers=WORKER).json())  # noqa: E731
    assert n("") == 1
    assert n("city=Fremont") == 1
    assert n("city=Oakland") == 0
    assert n("tags=dishes") == 1
    assert n("tags=laundry") == 0
    assert n("min_pay=25") == 1
    assert n("min_pay=35") == 0
    assert n("pay_type=monthly") == 0
    assert n("start_timing=asap") == 1
    assert n("days=fri&times=afternoon") == 1
    assert n("q=vegetarian") == 1


def test_matching_ranks_by_overlap(client, worker, customer):
    # A second worker with no overlapping tags should not match at all.
    client.post("/me", json={"role": "worker", "phone": "+15550000002"}, headers=WORKER2)
    client.put(
        "/workers/me",
        json={**WORKER_PROFILE, "display_name": "Nanny", "tags": ["childcare"]},
        headers=WORKER2,
    )
    m = client.get("/workers/matching", headers=CUSTOMER).json()
    assert [w["display_name"] for w in m] == ["Sunita"]
    assert m[0]["match_score"] > 0

    m = client.get("/customers/matching", headers=WORKER).json()
    assert [c["display_name"] for c in m] == ["Batta family"]
    assert client.get("/customers/matching", headers=WORKER2).json() == []


def test_phone_hidden_until_connected(client, worker, customer):
    assert client.get("/workers", headers=CUSTOMER).json()[0]["phone"] is None
    assert client.get(f"/customers/{customer['user_id']}", headers=WORKER).json()["phone"] is None


def test_hidden_profiles(client, worker, customer):
    client.put("/workers/me", json={**WORKER_PROFILE, "is_visible": False}, headers=WORKER)
    assert client.get("/workers", headers=CUSTOMER).json() == []
    assert client.get(f"/workers/{worker['user_id']}", headers=CUSTOMER).status_code == 404
    assert client.get("/workers/matching", headers=CUSTOMER).json() == []
    client.put("/customers/me", json={**CUSTOMER_PROFILE, "is_active": False}, headers=CUSTOMER)
    assert client.get("/customers", headers=WORKER).json() == []
    assert client.get("/customers/matching", headers=WORKER).json() == []


def test_city_coverage_drives_matching(client, worker, customer):
    # Household in Fremont is covered (worker works in Fremont/Newark)
    assert len(client.get("/customers/matching", headers=WORKER).json()) == 1
    # Move the household to Oakland: no longer covered
    client.put("/customers/me", json={**CUSTOMER_PROFILE, "city": "Oakland"}, headers=CUSTOMER)
    assert client.get("/customers/matching", headers=WORKER).json() == []
    assert client.get("/workers/matching", headers=CUSTOMER).json() == []
    # /workers?city= filters by work cities
    assert len(client.get("/workers?city=Newark", headers=CUSTOMER).json()) == 1
    assert len(client.get("/workers?city=Oakland", headers=CUSTOMER).json()) == 0


def test_worker_city_validation(client, worker):
    assert (
        client.put(
            "/workers/me", json={**WORKER_PROFILE, "work_cities": []}, headers=WORKER
        ).status_code
        == 422
    )
    assert (
        client.put(
            "/workers/me", json={**WORKER_PROFILE, "work_cities": ["Delhi"]}, headers=WORKER
        ).status_code
        == 422
    )
    r = client.get("/workers/me", headers=WORKER).json()
    assert r["city"] == "Fremont" and r["work_cities"] == ["Fremont", "Newark"]
