from conftest import CUSTOMER, JOB, WORKER, WORKER2


def test_worker_cannot_post_job(client, worker):
    assert client.post("/jobs", json=JOB, headers=WORKER).status_code == 403


def test_create_and_list(client, job, worker):
    jobs = client.get("/jobs", headers=WORKER).json()
    assert len(jobs) == 1
    assert jobs[0]["customer_name"] == "Batta family"
    assert jobs[0]["my_application_status"] is None


def test_other_tag_requires_text(client, customer):
    assert (
        client.post("/jobs", json={**JOB, "tags": ["other"]}, headers=CUSTOMER).status_code == 422
    )
    r = client.post(
        "/jobs", json={**JOB, "tags": ["other"], "other_tag_text": "pet care"}, headers=CUSTOMER
    )
    assert r.status_code == 201


def test_filters(client, job, worker):
    g = lambda qs: len(client.get(f"/jobs?{qs}", headers=WORKER).json())  # noqa: E731
    assert g("tags=cooking") == 1
    assert g("tags=laundry") == 0
    assert g("tags=laundry&tags=dishes") == 1
    assert g("city=Fremont") == 1
    assert g("city=Oakland") == 0
    assert g("min_pay=25") == 1
    assert g("min_pay=35") == 0
    assert g("pay_type=monthly") == 0
    assert g("q=vegetarian") == 1


def test_matching_uses_profile(client, job, worker):
    assert len(client.get("/jobs/matching", headers=WORKER).json()) == 1
    client.put("/workers/me", json={**worker, "city": "Oakland"}, headers=WORKER)
    assert client.get("/jobs/matching", headers=WORKER).json() == []


def test_update_and_close(client, job, worker):
    r = client.patch(f"/jobs/{job['id']}", json={"status": "closed"}, headers=CUSTOMER)
    assert r.status_code == 200 and r.json()["status"] == "closed"
    assert client.get("/jobs", headers=WORKER).json() == []
    assert len(client.get("/jobs?status=all", headers=WORKER).json()) == 1
    assert len(client.get("/jobs/mine", headers=CUSTOMER).json()) == 1


def test_only_owner_edits(client, job, customer):
    other = {"Authorization": "Bearer dev:c2:c2@x.com"}
    client.post("/me", json={"role": "customer"}, headers=other)
    assert client.patch(f"/jobs/{job['id']}", json={"title": "x"}, headers=other).status_code == 404


def test_apply_flow(client, job, worker):
    r = client.post(
        f"/jobs/{job['id']}/apply", json={"message": "I can start Monday"}, headers=WORKER
    )
    assert r.status_code == 201, r.text
    app_id = r.json()["id"]
    assert client.post(f"/jobs/{job['id']}/apply", json={}, headers=WORKER).status_code == 409

    mine = client.get("/applications/me", headers=WORKER).json()
    assert len(mine) == 1 and mine[0]["job"]["title"] == JOB["title"]
    assert client.get("/jobs", headers=WORKER).json()[0]["my_application_status"] == "pending"

    apps = client.get(f"/jobs/{job['id']}/applications", headers=CUSTOMER).json()
    assert len(apps) == 1
    assert apps[0]["worker"]["display_name"] == "Sunita"
    assert apps[0]["worker"]["phone"] == "+14085551234"

    r = client.patch(f"/applications/{app_id}", json={"status": "accepted"}, headers=CUSTOMER)
    assert r.status_code == 200 and r.json()["status"] == "accepted"
    assert client.get(f"/jobs/{job['id']}", headers=CUSTOMER).json()["status"] == "filled"
    # Filled jobs no longer accept applications
    client.post("/me", json={"role": "worker", "phone": "+2"}, headers=WORKER2)
    assert client.post(f"/jobs/{job['id']}/apply", json={}, headers=WORKER2).status_code == 404


def test_apply_requires_profile(client, job):
    client.post("/me", json={"role": "worker", "phone": "+2"}, headers=WORKER2)
    assert client.post(f"/jobs/{job['id']}/apply", json={}, headers=WORKER2).status_code == 422


def test_worker_cannot_see_applications(client, job, worker):
    assert client.get(f"/jobs/{job['id']}/applications", headers=WORKER).status_code == 403
