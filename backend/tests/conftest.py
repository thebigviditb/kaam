import os

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["AUTH_DEV_BYPASS"] = "true"
os.environ["MEDIA_BUCKET"] = ""

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app import db as dbmod  # noqa: E402
from app.main import app  # noqa: E402

engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def _override_db():
    s = TestSession()
    try:
        yield s
    finally:
        s.close()


app.dependency_overrides[dbmod.get_db] = _override_db


@pytest.fixture(autouse=True)
def fresh_db():
    dbmod.Base.metadata.create_all(engine)
    yield
    dbmod.Base.metadata.drop_all(engine)


@pytest.fixture
def client():
    return TestClient(app)


def auth(sub: str, email: str | None = None):
    return {"Authorization": f"Bearer dev:{sub}:{email or sub + '@example.com'}"}


WORKER = auth("worker-1")
WORKER2 = auth("worker-2")
CUSTOMER = auth("customer-1")
CUSTOMER2 = auth("customer-2")

WORKER_PROFILE = {
    "display_name": "Sunita",
    "bio": "10 years cooking North Indian food",
    "tags": ["cooking", "cleaning"],
    "years_experience": 10,
    "hourly_rate": 25,
    "days": ["mon", "tue", "wed", "thu", "fri"],
    "times": ["morning", "afternoon"],
}

CUSTOMER_PROFILE = {
    "display_name": "Batta family",
    "city": "Fremont",
    "tags": ["cooking", "dishes"],
    "description": "Lunch and dinner, vegetarian.",
    "pay_amount": 30,
    "pay_type": "hourly",
    "start_timing": "asap",
    "days": ["mon", "wed", "fri"],
    "times": ["afternoon"],
}


@pytest.fixture
def worker(client):
    r = client.post("/me", json={"role": "worker", "phone": "+14085551234"}, headers=WORKER)
    assert r.status_code == 201, r.text
    r = client.put("/workers/me", json=WORKER_PROFILE, headers=WORKER)
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture
def customer(client):
    r = client.post("/me", json={"role": "customer", "phone": "+14085559999"}, headers=CUSTOMER)
    assert r.status_code == 201, r.text
    r = client.put("/customers/me", json=CUSTOMER_PROFILE, headers=CUSTOMER)
    assert r.status_code == 200, r.text
    return r.json()
