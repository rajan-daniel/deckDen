from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from webauthn.helpers import base64url_to_bytes, bytes_to_base64url

import app.main as main_module
from app import models

# A real attestation can only be produced by a browser's authenticator, so the
# success paths below replace py_webauthn's parse/verify calls (same approach as
# test_pokemon_search.py). That tests OUR logic - challenge handling, encoding,
# storage - not the library's cryptography.


def _options(client, headers):
    resp = client.post("/webauthn/register/options", headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json()


def _latest_challenge(db_session, user_id):
    db_session.expire_all()
    return (
        db_session.query(models.WebAuthnChallenge)
        .filter_by(user_id=user_id, purpose="registration")
        .order_by(models.WebAuthnChallenge.id.desc())
        .first()
    )


def _verify(client, headers, payload=None):
    return client.post("/webauthn/register/verify", json=payload or {"id": "x"}, headers=headers)


def _credentials(db_session):
    db_session.expire_all()
    return db_session.query(models.WebAuthnCredential).all()


@pytest.fixture(autouse=True)
def _webauthn_env(monkeypatch):
    monkeypatch.setenv("WEBAUTHN_RP_ID", "localhost")
    monkeypatch.setenv("WEBAUTHN_EXPECTED_ORIGIN", "http://localhost:3000")


@pytest.fixture
def passing_verification(monkeypatch):
    """py_webauthn accepts the response. Records the arguments verify was given."""
    calls = []
    monkeypatch.setattr(main_module, "parse_registration_credential_json", lambda payload: payload)

    def fake_verify(**kwargs):
        calls.append(kwargs)
        return SimpleNamespace(
            credential_id=b"cred-id-1",
            credential_public_key=b"public-key-1",
            sign_count=0,
        )

    monkeypatch.setattr(main_module, "verify_registration_response", fake_verify)
    return calls


@pytest.fixture
def failing_verification(monkeypatch):
    """py_webauthn rejects the response."""
    monkeypatch.setattr(main_module, "parse_registration_credential_json", lambda payload: payload)

    def fake_verify(**kwargs):
        raise ValueError("bad attestation")

    monkeypatch.setattr(main_module, "verify_registration_response", fake_verify)


# --- register/options ---


def test_register_options_requires_auth(client):
    resp = client.post("/webauthn/register/options")

    assert resp.status_code == 401


def test_register_options_stores_a_matching_unused_challenge(make_user, client, db_session):
    user, headers = make_user()

    body = _options(client, headers)

    row = _latest_challenge(db_session, user["id"])
    assert row.challenge == body["challenge"]
    assert row.used_at is None
    now = datetime.now(timezone.utc)
    assert now < row.expires_at <= now + timedelta(seconds=61)


def test_register_options_requires_user_verification(make_user, client):
    # Must agree with require_user_verification=True in register/verify, or a
    # valid authenticator can skip verification and then get rejected.
    _, headers = make_user()

    body = _options(client, headers)

    assert body["authenticatorSelection"]["userVerification"] == "required"


def test_register_options_uses_the_configured_rp_id(make_user, client, monkeypatch):
    # The production bug: the relying-party id defaulted to "localhost" on the
    # live site because nothing set it.
    monkeypatch.setenv("WEBAUTHN_RP_ID", "deck-den.example.com")
    _, headers = make_user()

    body = _options(client, headers)

    assert body["rp"]["id"] == "deck-den.example.com"


# --- register/verify: rejections ---


def test_register_verify_requires_auth(client):
    resp = client.post("/webauthn/register/verify", json={"id": "x"})

    assert resp.status_code == 401


def test_register_verify_without_a_challenge_is_rejected(make_user, client, passing_verification):
    _, headers = make_user()

    resp = _verify(client, headers)

    assert resp.status_code == 400
    assert resp.json()["detail"] == "Registration challenge not found."
    assert passing_verification == []


def test_register_verify_with_an_expired_challenge_is_rejected(
    make_user, client, db_session, passing_verification
):
    user, headers = make_user()
    _options(client, headers)
    row = _latest_challenge(db_session, user["id"])
    row.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db_session.commit()

    resp = _verify(client, headers)

    assert resp.status_code == 400
    assert resp.json()["detail"] == "Challenge has expired."
    assert passing_verification == []
    assert _credentials(db_session) == []


def test_register_verify_with_an_unreadable_payload_fails_cleanly_and_burns_the_challenge(
    make_user, client, db_session
):
    # No fake here: py_webauthn's real parser rejects this.
    user, headers = make_user()
    _options(client, headers)

    resp = _verify(client, headers, {"id": "garbage"})

    assert resp.status_code == 400
    assert resp.json()["detail"] == "Passkey registration failed."
    assert _latest_challenge(db_session, user["id"]).used_at is not None
    assert _credentials(db_session) == []


def test_a_failed_verification_still_burns_the_challenge(
    make_user, client, db_session, failing_verification
):
    user, headers = make_user()
    _options(client, headers)

    first = _verify(client, headers)
    retry = _verify(client, headers)

    assert first.status_code == 400
    assert first.json()["detail"] == "Passkey registration failed."
    assert _latest_challenge(db_session, user["id"]).used_at is not None
    # The same challenge can't be retried; a new options call is required.
    assert retry.status_code == 400
    assert retry.json()["detail"] == "Registration challenge not found."
    assert _credentials(db_session) == []


def test_a_challenge_belonging_to_another_user_cannot_be_used(
    make_user, client, db_session, passing_verification
):
    alice, alice_headers = make_user(username="alice", email="alice@example.com")
    _, bob_headers = make_user(username="bob", email="bob@example.com")
    _options(client, alice_headers)

    resp = _verify(client, bob_headers)

    assert resp.status_code == 400
    assert resp.json()["detail"] == "Registration challenge not found."
    assert passing_verification == []
    assert _credentials(db_session) == []
    assert _latest_challenge(db_session, alice["id"]).used_at is None


# --- register/verify: success ---


def test_register_verify_stores_the_credential_encoded_and_burns_the_challenge(
    make_user, client, db_session, passing_verification
):
    user, headers = make_user()
    _options(client, headers)
    stored_challenge = _latest_challenge(db_session, user["id"]).challenge

    resp = _verify(client, headers)

    assert resp.status_code == 200
    (credential,) = _credentials(db_session)
    assert credential.user_id == user["id"]
    assert credential.credential_id == bytes_to_base64url(b"cred-id-1")
    assert credential.public_key == bytes_to_base64url(b"public-key-1")
    assert credential.sign_count == 0
    assert _latest_challenge(db_session, user["id"]).used_at is not None

    # And py_webauthn was asked to check the right things.
    (call,) = passing_verification
    assert call["expected_challenge"] == base64url_to_bytes(stored_challenge)
    assert call["expected_rp_id"] == "localhost"
    assert call["expected_origin"] == "http://localhost:3000"
    assert call["require_user_verification"] is True


def test_registering_the_same_passkey_twice_is_a_clean_400(
    make_user, client, db_session, passing_verification
):
    _, headers = make_user()
    _options(client, headers)
    assert _verify(client, headers).status_code == 200
    _options(client, headers)

    resp = _verify(client, headers)

    assert resp.status_code == 400
    assert resp.json()["detail"] == "This passkey is already registered."
    assert len(_credentials(db_session)) == 1
