import os
import tempfile
from pathlib import Path

import pytest

# These env vars must be set BEFORE any `app.*` module is imported:
# app.security raises at import time if SECRET_KEY is missing, and
# app.database reads DATABASE_URL at import time to build the engine.
# Using a file-based SQLite DB (not ":memory:") so every connection the
# app opens during a test sees the same tables — an in-memory DB would
# hand out a fresh empty database per connection without extra config.
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")
os.environ["DATABASE_URL"] = f"sqlite:///{Path(tempfile.gettempdir()) / 'deckden_test.db'}"

from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(autouse=True)
def _clean_database():
    """Drop and recreate every table before each test so tests never
    see data left behind by a previous test."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def db_session():
    """Direct DB access for test setup/assertions that go beyond what the
    API surface exposes (e.g. backdating a token's expiry)."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def make_user(client):
    """Signs a user up and logs them in, returning (user_json, auth_headers)."""

    def _make(username="alice", email="alice@example.com", password="hunter2222"):
        signup_resp = client.post(
            "/signup",
            json={"username": username, "email": email, "password": password},
        )
        assert signup_resp.status_code == 200, signup_resp.text
        login_resp = client.post("/login", json={"email": email, "password": password})
        assert login_resp.status_code == 200, login_resp.text
        token = login_resp.json()["access_token"]
        return signup_resp.json(), {"Authorization": f"Bearer {token}"}

    return _make
