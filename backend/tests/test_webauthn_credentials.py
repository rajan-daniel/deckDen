from datetime import datetime, timezone

from app import models


def _add_passkey(db_session, user_id, credential_id="cred-1"):
    # Inserted straight into the database: a real passkey can only be created by
    # a browser's authenticator, and this file tests our endpoints, not that.
    passkey = models.WebAuthnCredential(
        user_id=user_id,
        credential_id=credential_id,
        public_key="not-a-real-key",
        sign_count=0,
    )
    db_session.add(passkey)
    db_session.commit()
    db_session.refresh(passkey)
    return passkey


def test_delete_passkey_requires_auth(client):
    resp = client.delete("/webauthn/credentials/1")

    assert resp.status_code == 401


def test_cannot_delete_another_users_passkey(make_user, client, db_session):
    alice, alice_headers = make_user(username="alice", email="alice@example.com")
    bob, _ = make_user(username="bob", email="bob@example.com")
    bobs_passkey = _add_passkey(db_session, bob["id"], "bob-cred")

    resp = client.delete(f"/webauthn/credentials/{bobs_passkey.id}", headers=alice_headers)

    assert resp.status_code == 404
    # The real assertion: the request was refused AND nothing was deleted.
    db_session.expire_all()
    assert db_session.get(models.WebAuthnCredential, bobs_passkey.id) is not None

def test_cannot_get_another_users_passkey(make_user, client, db_session):
    alice, alice_headers = make_user(username="alice", email="alice@example.com")
    bob, _ = make_user(username="bob", email="bob@example.com")
    bobs_passkey = _add_passkey(db_session, bob["id"], "bob-cred")
    alices_passkey = _add_passkey(db_session, alice["id"], "alice-cred")

    resp = client.get("/webauthn/credentials", headers=alice_headers)

    assert resp.status_code == 200
    returned_ids = [p["id"] for p in resp.json()]
    # Assert on the CONTENTS: exactly Alice's passkey, and not Bob's.
    # The real assertion: the request was refused AND nothing was recieved.
    db_session.expire_all()
    assert returned_ids == [alices_passkey.id]
    assert bobs_passkey.id not in returned_ids


def test_list_passkeys_requires_auth(client):
    resp = client.get("/webauthn/credentials")

    assert resp.status_code == 401


def test_list_passkeys_is_empty_for_a_user_with_none(make_user, client):
    _, headers = make_user()

    resp = client.get("/webauthn/credentials", headers=headers)

    assert resp.status_code == 200
    assert resp.json() == []


def test_list_passkeys_exposes_only_the_safe_fields(make_user, client, db_session):
    user, headers = make_user()
    _add_passkey(db_session, user["id"], "visible-credential-id")

    resp = client.get("/webauthn/credentials", headers=headers)

    (item,) = resp.json()
    assert set(item) == {"id", "device_label", "created_at", "last_used_at"}
    # The stored key material must never leave the server.
    assert "not-a-real-key" not in resp.text
    assert "visible-credential-id" not in resp.text


def test_list_passkeys_is_newest_first(make_user, client, db_session):
    user, headers = make_user()
    older = _add_passkey(db_session, user["id"], "older")
    newer = _add_passkey(db_session, user["id"], "newer")
    older.created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    newer.created_at = datetime(2026, 6, 1, tzinfo=timezone.utc)
    db_session.commit()

    resp = client.get("/webauthn/credentials", headers=headers)

    assert [p["id"] for p in resp.json()] == [newer.id, older.id]


def test_can_delete_your_own_passkey_and_keep_the_others(make_user, client, db_session):
    user, headers = make_user()
    doomed_id = _add_passkey(db_session, user["id"], "doomed").id
    kept_id = _add_passkey(db_session, user["id"], "kept").id

    resp = client.delete(f"/webauthn/credentials/{doomed_id}", headers=headers)

    assert resp.status_code == 200
    # Ids captured up front: reading an attribute off a deleted row would raise.
    db_session.expire_all()
    assert db_session.get(models.WebAuthnCredential, doomed_id) is None
    assert db_session.get(models.WebAuthnCredential, kept_id) is not None


def test_deleting_a_missing_passkey_looks_the_same_as_deleting_someone_elses(
    make_user, client, db_session
):
    # If these two answers differed, the endpoint would reveal which ids exist.
    _, alice_headers = make_user(username="alice", email="alice@example.com")
    bob, _ = make_user(username="bob", email="bob@example.com")
    bobs_passkey = _add_passkey(db_session, bob["id"], "bob-cred")

    someone_elses = client.delete(f"/webauthn/credentials/{bobs_passkey.id}", headers=alice_headers)
    missing = client.delete("/webauthn/credentials/99999", headers=alice_headers)

    assert (someone_elses.status_code, someone_elses.json()) == (missing.status_code, missing.json())
    assert missing.status_code == 404