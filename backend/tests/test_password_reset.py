from datetime import datetime, timedelta, timezone

import pytest

import app.main as main_module
from app import models


@pytest.fixture
def sent_emails(monkeypatch):
    """Replaces the real Resend call with something that just records what
    would have been sent, so tests can grab the reset token without needing
    a real inbox or a RESEND_API_KEY."""
    calls = []
    monkeypatch.setattr(
        main_module.email_service,
        "send_password_reset_email",
        lambda to_email, token: calls.append((to_email, token)),
    )
    return calls


def test_request_reset_for_existing_email_sends_one_email(make_user, client, sent_emails):
    make_user(email="alice@example.com")

    resp = client.post("/password-reset/request", json={"email": "alice@example.com"})

    assert resp.status_code == 200
    assert len(sent_emails) == 1
    assert sent_emails[0][0] == "alice@example.com"


def test_request_reset_for_unknown_email_gives_identical_response_and_sends_nothing(
    make_user, client, sent_emails
):
    make_user(email="alice@example.com")

    known_resp = client.post("/password-reset/request", json={"email": "alice@example.com"})
    sent_emails.clear()
    unknown_resp = client.post("/password-reset/request", json={"email": "nobody@example.com"})

    # Response body must be identical either way, or an attacker could use
    # this endpoint to check which emails are registered.
    assert unknown_resp.status_code == known_resp.status_code
    assert unknown_resp.json() == known_resp.json()
    assert sent_emails == []


def test_confirm_reset_with_valid_token_changes_password(make_user, client, sent_emails):
    make_user(email="alice@example.com", password="original-pw")
    client.post("/password-reset/request", json={"email": "alice@example.com"})
    token = sent_emails[0][1]

    resp = client.post(
        "/password-reset/confirm",
        json={"token": token, "new_password": "brand-new-pw"},
    )
    assert resp.status_code == 200

    old_login = client.post("/login", json={"email": "alice@example.com", "password": "original-pw"})
    new_login = client.post("/login", json={"email": "alice@example.com", "password": "brand-new-pw"})
    assert old_login.status_code == 401
    assert new_login.status_code == 200


def test_confirm_reset_with_bogus_token_rejected(client):
    resp = client.post(
        "/password-reset/confirm",
        json={"token": "totally-made-up-token", "new_password": "brand-new-pw"},
    )
    assert resp.status_code == 400


def test_confirm_reset_token_cannot_be_reused(make_user, client, sent_emails):
    make_user(email="alice@example.com", password="original-pw")
    client.post("/password-reset/request", json={"email": "alice@example.com"})
    token = sent_emails[0][1]

    first = client.post(
        "/password-reset/confirm", json={"token": token, "new_password": "brand-new-pw"}
    )
    second = client.post(
        "/password-reset/confirm", json={"token": token, "new_password": "yet-another-pw"}
    )

    assert first.status_code == 200
    assert second.status_code == 400


def test_confirm_reset_with_expired_token_rejected(make_user, client, sent_emails, db_session):
    make_user(email="alice@example.com", password="original-pw")
    client.post("/password-reset/request", json={"email": "alice@example.com"})

    # Backdate the token's expiry directly in the DB - there's no API
    # surface for this, so it's the one place a test reaches past the
    # HTTP layer into storage.
    reset_token = db_session.query(models.PasswordResetToken).first()
    reset_token.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    db_session.commit()

    token = sent_emails[0][1]
    resp = client.post(
        "/password-reset/confirm", json={"token": token, "new_password": "brand-new-pw"}
    )

    assert resp.status_code == 400
