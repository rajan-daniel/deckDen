from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from webauthn.helpers import base64url_to_bytes, bytes_to_base64url

import app.main as main_module
from app import models

# As in the registration tests: a real assertion can only come from a browser's
# authenticator, so the success paths replace py_webauthn's parse/verify calls.
# These tests cover OUR logic - who is being logged in, challenge handling,
# sign-count bookkeeping, and the session that comes back.

GENERIC_401 = {"detail": "Invalid email or password"}
STORED_PUBLIC_KEY = b"stored-public-key"
CRED_ID = bytes_to_base64url(b"cred-bytes-1")
OTHER_CRED_ID = bytes_to_base64url(b"cred-bytes-2")


def _add_passkey(db_session, user_id, credential_id=CRED_ID, sign_count=3):
    passkey = models.WebAuthnCredential(
        user_id=user_id,
        credential_id=credential_id,
        public_key=bytes_to_base64url(STORED_PUBLIC_KEY),
        sign_count=sign_count,
    )
    db_session.add(passkey)
    db_session.commit()
    db_session.refresh(passkey)
    return passkey


def _options(client, email):
    return client.post("/webauthn/login/options", json={"email": email})


def _verify(client, credential_id=CRED_ID):
    return client.post("/webauthn/login/verify", json={"id": credential_id})


def _latest_challenge(db_session, user_id):
    db_session.expire_all()
    return (
        db_session.query(models.WebAuthnChallenge)
        .filter_by(user_id=user_id, purpose="login")
        .order_by(models.WebAuthnChallenge.id.desc())
        .first()
    )


def _fresh_passkey(db_session, passkey_id):
    db_session.expire_all()
    return db_session.get(models.WebAuthnCredential, passkey_id)


@pytest.fixture(autouse=True)
def _webauthn_env(monkeypatch):
    monkeypatch.setenv("WEBAUTHN_RP_ID", "localhost")
    monkeypatch.setenv("WEBAUTHN_EXPECTED_ORIGIN", "http://localhost:3000")


@pytest.fixture
def passing_verification(monkeypatch):
    """py_webauthn accepts the assertion. Records the arguments verify was given."""
    calls = []
    monkeypatch.setattr(
        main_module,
        "parse_authentication_credential_json",
        lambda payload: SimpleNamespace(id=payload["id"]),
    )

    def fake_verify(**kwargs):
        calls.append(kwargs)
        return SimpleNamespace(new_sign_count=9)

    monkeypatch.setattr(main_module, "verify_authentication_response", fake_verify)
    return calls


@pytest.fixture
def failing_verification(monkeypatch):
    """py_webauthn rejects the assertion. Records how many times it was called."""
    calls = []
    monkeypatch.setattr(
        main_module,
        "parse_authentication_credential_json",
        lambda payload: SimpleNamespace(id=payload["id"]),
    )

    def fake_verify(**kwargs):
        calls.append(kwargs)
        raise ValueError("bad signature")

    monkeypatch.setattr(main_module, "verify_authentication_response", fake_verify)
    return calls


# --- login/options ---


def test_login_options_for_an_unknown_email_gets_the_generic_401(client):
    resp = _options(client, "nobody@example.com")

    assert resp.status_code == 401
    assert resp.json() == GENERIC_401


def test_login_options_cannot_tell_an_unknown_email_from_an_account_with_no_passkeys(
    make_user, client
):
    # The whole point: if these two answers ever differ, the endpoint reveals
    # which emails have accounts.
    make_user(username="alice", email="alice@example.com")

    no_passkeys = _options(client, "alice@example.com")
    unknown = _options(client, "nobody@example.com")

    assert (no_passkeys.status_code, no_passkeys.json()) == (unknown.status_code, unknown.json())
    assert no_passkeys.json() == GENERIC_401


def test_login_options_needs_no_session_and_lists_only_that_users_passkeys(
    make_user, client, db_session
):
    alice, _ = make_user(username="alice", email="alice@example.com")
    bob, _ = make_user(username="bob", email="bob@example.com")
    _add_passkey(db_session, alice["id"], CRED_ID)
    _add_passkey(db_session, bob["id"], OTHER_CRED_ID)

    resp = _options(client, "alice@example.com")  # note: no Authorization header

    assert resp.status_code == 200
    assert [c["id"] for c in resp.json()["allowCredentials"]] == [CRED_ID]


def test_login_options_requires_user_verification_and_uses_the_configured_rp_id(
    make_user, client, db_session, monkeypatch
):
    monkeypatch.setenv("WEBAUTHN_RP_ID", "deck-den.example.com")
    alice, _ = make_user(username="alice", email="alice@example.com")
    _add_passkey(db_session, alice["id"])

    body = _options(client, "alice@example.com").json()

    assert body["userVerification"] == "required"
    assert body["rpId"] == "deck-den.example.com"


def test_login_options_stores_a_matching_unused_login_challenge(make_user, client, db_session):
    alice, _ = make_user(username="alice", email="alice@example.com")
    _add_passkey(db_session, alice["id"])

    body = _options(client, "alice@example.com").json()

    row = _latest_challenge(db_session, alice["id"])
    assert row.challenge == body["challenge"]
    assert row.used_at is None
    now = datetime.now(timezone.utc)
    assert now < row.expires_at <= now + timedelta(seconds=61)


# --- login/verify: rejections (every one must be the same generic 401) ---


def test_login_verify_with_an_unreadable_payload_gets_the_generic_401(client):
    # No fake here: py_webauthn's real parser rejects this.
    resp = client.post("/webauthn/login/verify", json={"id": "garbage"})

    assert resp.status_code == 401
    assert resp.json() == GENERIC_401


def test_login_verify_with_an_unknown_credential_gets_the_generic_401(client, passing_verification):
    resp = _verify(client, "AAAA")

    assert resp.status_code == 401
    assert resp.json() == GENERIC_401
    assert passing_verification == []


def test_login_verify_without_a_challenge_is_rejected(
    make_user, client, db_session, passing_verification
):
    alice, _ = make_user(username="alice", email="alice@example.com")
    _add_passkey(db_session, alice["id"])

    resp = _verify(client)

    assert resp.status_code == 401
    assert resp.json() == GENERIC_401
    assert passing_verification == []


def test_login_verify_with_an_expired_challenge_is_rejected(
    make_user, client, db_session, passing_verification
):
    alice, _ = make_user(username="alice", email="alice@example.com")
    _add_passkey(db_session, alice["id"])
    _options(client, "alice@example.com")
    row = _latest_challenge(db_session, alice["id"])
    row.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db_session.commit()

    resp = _verify(client)

    assert resp.status_code == 401
    assert resp.json() == GENERIC_401
    assert passing_verification == []


def test_a_challenge_issued_to_another_user_cannot_log_you_in(
    make_user, client, db_session, passing_verification
):
    alice, _ = make_user(username="alice", email="alice@example.com")
    bob, _ = make_user(username="bob", email="bob@example.com")
    _add_passkey(db_session, alice["id"], CRED_ID)
    _add_passkey(db_session, bob["id"], OTHER_CRED_ID)
    _options(client, "alice@example.com")  # only Alice has a pending challenge

    resp = _verify(client, OTHER_CRED_ID)  # an assertion for Bob's credential

    assert resp.status_code == 401
    assert resp.json() == GENERIC_401
    assert passing_verification == []
    assert _latest_challenge(db_session, alice["id"]).used_at is None


def test_a_failed_verification_burns_the_challenge_and_changes_nothing(
    make_user, client, db_session, failing_verification
):
    alice, _ = make_user(username="alice", email="alice@example.com")
    passkey = _add_passkey(db_session, alice["id"], sign_count=3)
    _options(client, "alice@example.com")

    first = _verify(client)
    retry = _verify(client)

    assert first.status_code == 401
    assert first.json() == GENERIC_401
    assert _latest_challenge(db_session, alice["id"]).used_at is not None
    stored = _fresh_passkey(db_session, passkey.id)
    assert stored.sign_count == 3
    assert stored.last_used_at is None
    # The burned challenge can't be retried: verification isn't even attempted again.
    assert retry.status_code == 401
    assert len(failing_verification) == 1


# --- login/verify: success ---


def test_login_verify_returns_a_session_for_the_credentials_owner(
    make_user, client, db_session, passing_verification
):
    alice, _ = make_user(username="alice", email="alice@example.com")
    bob, _ = make_user(username="bob", email="bob@example.com")
    _add_passkey(db_session, alice["id"], CRED_ID)
    _add_passkey(db_session, bob["id"], OTHER_CRED_ID)
    _options(client, "alice@example.com")

    resp = _verify(client, CRED_ID)

    assert resp.status_code == 200
    assert resp.json()["token_type"] == "bearer"
    me = client.get("/me", headers={"Authorization": f"Bearer {resp.json()['access_token']}"})
    assert me.status_code == 200
    assert me.json()["email"] == "alice@example.com"


def test_login_verify_updates_the_sign_count_and_burns_the_challenge(
    make_user, client, db_session, passing_verification
):
    alice, _ = make_user(username="alice", email="alice@example.com")
    passkey = _add_passkey(db_session, alice["id"], sign_count=3)
    _options(client, "alice@example.com")
    stored_challenge = _latest_challenge(db_session, alice["id"]).challenge

    resp = _verify(client)

    assert resp.status_code == 200
    stored = _fresh_passkey(db_session, passkey.id)
    assert stored.sign_count == 9
    assert stored.last_used_at is not None
    assert _latest_challenge(db_session, alice["id"]).used_at is not None

    # And py_webauthn was handed the right stored values to check against.
    (call,) = passing_verification
    assert call["expected_challenge"] == base64url_to_bytes(stored_challenge)
    assert call["credential_public_key"] == STORED_PUBLIC_KEY
    assert call["credential_current_sign_count"] == 3
    assert call["expected_rp_id"] == "localhost"
    assert call["expected_origin"] == "http://localhost:3000"
    assert call["require_user_verification"] is True


def test_the_same_assertion_cannot_be_replayed(
    make_user, client, db_session, passing_verification
):
    alice, _ = make_user(username="alice", email="alice@example.com")
    _add_passkey(db_session, alice["id"])
    _options(client, "alice@example.com")
    assert _verify(client).status_code == 200

    replay = _verify(client)

    assert replay.status_code == 401
    assert replay.json() == GENERIC_401
    assert len(passing_verification) == 1
