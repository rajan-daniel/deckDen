import hashlib
import re
from datetime import datetime, timedelta, timezone

import app.main as main_module
from app import models
from app.security import PAT_PREFIX, hash_reset_token

# The ONLY endpoints a personal access token may reach. Adding to this list is a
# security decision, so test_the_allow_list_is_exactly_these_endpoints makes it
# a deliberate one.
ALLOW_LIST = {
    ("GET", "/me"),
    ("GET", "/me/decks"),
    ("GET", "/me/decks/{deck_id}"),
}


def _create(client, headers, name="Claude Desktop"):
    resp = client.post("/me/tokens", json={"name": name}, headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json()


def _bearer(token):
    return {"Authorization": f"Bearer {token}"}


def _row(db_session, token_id):
    db_session.expire_all()
    return db_session.get(models.PersonalAccessToken, token_id)


def _now():
    return datetime.now(timezone.utc)


def _close(a, b, seconds=5):
    return abs((a - b).total_seconds()) <= seconds


def _depends_on(dependant, target):
    return any(d.call is target or _depends_on(d, target) for d in dependant.dependencies)


def _routes_depending_on(target):
    found = set()
    for route in main_module.app.routes:
        if hasattr(route, "dependant") and _depends_on(route.dependant, target):
            for method in route.methods - {"HEAD", "OPTIONS"}:
                found.add((method, route.path))
    return found


# --- creating and listing ---


def test_creating_a_token_requires_a_login_session(client):
    resp = client.post("/me/tokens", json={"name": "Claude"})

    assert resp.status_code == 401


def test_the_plaintext_is_returned_once_and_only_its_hash_is_stored(make_user, client, db_session):
    _, headers = make_user()

    created = _create(client, headers)

    token = created["token"]
    assert token.startswith(PAT_PREFIX)
    row = _row(db_session, created["id"])
    assert row.token_hash == hashlib.sha256(token.encode()).hexdigest()
    # The plaintext appears in no column at all.
    for column in row.__table__.columns:
        assert token not in str(getattr(row, column.name))
    assert row.token_prefix == token[: len(PAT_PREFIX) + 4]
    assert row.scope == "read"


def test_listing_never_exposes_the_token_or_its_hash(make_user, client, db_session):
    _, headers = make_user()
    created = _create(client, headers)
    stored_hash = _row(db_session, created["id"]).token_hash

    resp = client.get("/me/tokens", headers=headers)

    (item,) = resp.json()
    assert set(item) == {"id", "name", "token_prefix", "scope", "created_at", "last_used_at", "expires_at"}
    assert created["token"] not in resp.text
    assert stored_hash not in resp.text


def test_a_new_token_expires_in_about_90_days(make_user, client, db_session):
    _, headers = make_user()

    created = _create(client, headers)

    assert _close(_row(db_session, created["id"]).expires_at, _now() + timedelta(days=90))


def test_a_blank_name_is_rejected(make_user, client):
    _, headers = make_user()

    assert client.post("/me/tokens", json={"name": "   "}, headers=headers).status_code == 400
    assert client.post("/me/tokens", json={"name": ""}, headers=headers).status_code == 422


def test_you_only_see_your_own_tokens(make_user, client):
    _, alice_headers = make_user(username="alice", email="alice@example.com")
    _, bob_headers = make_user(username="bob", email="bob@example.com")
    alices = _create(client, alice_headers, "Alice's assistant")
    _create(client, bob_headers, "Bob's assistant")

    resp = client.get("/me/tokens", headers=alice_headers)

    assert [t["id"] for t in resp.json()] == [alices["id"]]


def test_the_cap_is_ten_and_expired_tokens_dont_count(make_user, client, db_session):
    _, headers = make_user()
    tokens = [_create(client, headers, f"assistant {i}") for i in range(10)]

    over_the_cap = client.post("/me/tokens", json={"name": "one too many"}, headers=headers)

    assert over_the_cap.status_code == 400

    row = _row(db_session, tokens[0]["id"])
    row.expires_at = _now() - timedelta(days=1)
    db_session.commit()

    assert client.post("/me/tokens", json={"name": "fits now"}, headers=headers).status_code == 200
    # The expired one was cleared out rather than left to pile up.
    assert db_session.query(models.PersonalAccessToken).count() == 10


# --- using a token ---


def test_a_token_works_on_the_allow_listed_endpoints(make_user, client):
    user, headers = make_user()
    deck = client.post("/decks", json={"name": "Fire", "game": "Pokemon"}, headers=headers).json()
    token = _create(client, headers)["token"]

    me = client.get("/me", headers=_bearer(token))
    decks = client.get("/me/decks", headers=_bearer(token))
    one = client.get(f"/me/decks/{deck['id']}", headers=_bearer(token))

    assert me.status_code == 200 and me.json()["email"] == user["email"]
    assert decks.status_code == 200 and [d["name"] for d in decks.json()] == ["Fire"]
    assert one.status_code == 200 and one.json()["name"] == "Fire"


def test_a_login_session_still_works_on_the_same_endpoints(make_user, client):
    user, headers = make_user()

    resp = client.get("/me", headers=headers)

    assert resp.status_code == 200
    assert resp.json()["email"] == user["email"]


def test_each_token_acts_as_its_own_user(make_user, client):
    # Both users' tokens are exercised: a bug that resolved every token to the
    # first user would pass if only Alice's token were checked.
    _, alice_headers = make_user(username="alice", email="alice@example.com")
    _, bob_headers = make_user(username="bob", email="bob@example.com")
    alices_deck = client.post("/decks", json={"name": "Alice Deck", "game": "Pokemon"}, headers=alice_headers).json()
    client.post("/decks", json={"name": "Bob Deck", "game": "Pokemon"}, headers=bob_headers)
    alices_token = _create(client, alice_headers)["token"]
    bobs_token = _create(client, bob_headers)["token"]

    alices_decks = client.get("/me/decks", headers=_bearer(alices_token))
    bobs_decks = client.get("/me/decks", headers=_bearer(bobs_token))
    bob_opening_alices_deck = client.get(f"/me/decks/{alices_deck['id']}", headers=_bearer(bobs_token))

    assert [d["name"] for d in alices_decks.json()] == ["Alice Deck"]
    assert [d["name"] for d in bobs_decks.json()] == ["Bob Deck"]
    assert bob_opening_alices_deck.status_code == 404


def test_an_unknown_token_gets_the_generic_401(client):
    resp = client.get("/me", headers=_bearer(PAT_PREFIX + "this-was-never-issued"))

    assert resp.status_code == 401
    assert resp.json() == {"detail": "Invalid authentication token"}


def test_an_expired_token_is_rejected_with_a_helpful_message(make_user, client, db_session):
    _, headers = make_user()
    created = _create(client, headers)
    row = _row(db_session, created["id"])
    row.expires_at = _now() - timedelta(seconds=1)
    db_session.commit()

    resp = client.get("/me", headers=_bearer(created["token"]))

    assert resp.status_code == 401
    assert "expired" in resp.json()["detail"].lower()


# --- the allow-list: a token must not reach anything else ---


def test_a_token_is_rejected_on_every_endpoint_outside_the_allow_list(make_user, client):
    _, headers = make_user()
    token = _create(client, headers)["token"]

    session_only = _routes_depending_on(main_module.get_current_user)

    # Not vacuous: the dangerous endpoints are really in the set being checked.
    assert ("DELETE", "/me") in session_only
    assert ("POST", "/me/tokens") in session_only
    assert ("DELETE", "/webauthn/credentials/{passkey_id}") in session_only

    for method, path in sorted(session_only):
        url = re.sub(r"\{[^}]+\}", "1", path)
        body = {"json": {}} if method in {"POST", "PUT"} else {}
        resp = client.request(method, url, headers=_bearer(token), **body)
        assert resp.status_code == 401, f"{method} {path} accepted a personal access token"


def test_the_allow_list_is_exactly_these_endpoints():
    # If this fails, an endpoint was opened to (or removed from) personal access
    # tokens. That's a security decision: update ALLOW_LIST on purpose, not by accident.
    assert _routes_depending_on(main_module.get_current_user_or_token) == ALLOW_LIST


# --- idle expiry and the lifetime cap ---


def test_using_a_token_pushes_its_idle_expiry_out(make_user, client, db_session):
    _, headers = make_user()
    created = _create(client, headers)
    row = _row(db_session, created["id"])
    row.expires_at = _now() + timedelta(days=1)
    db_session.commit()

    client.get("/me", headers=_bearer(created["token"]))

    row = _row(db_session, created["id"])
    assert _close(row.expires_at, _now() + timedelta(days=90))
    assert row.last_used_at is not None


def test_usage_is_only_recorded_every_few_minutes(make_user, client, db_session):
    _, headers = make_user()
    created = _create(client, headers)
    client.get("/me", headers=_bearer(created["token"]))
    first_use = _row(db_session, created["id"]).last_used_at

    client.get("/me", headers=_bearer(created["token"]))
    assert _row(db_session, created["id"]).last_used_at == first_use

    row = _row(db_session, created["id"])
    row.last_used_at = _now() - timedelta(minutes=10)
    db_session.commit()
    client.get("/me", headers=_bearer(created["token"]))
    assert _close(_row(db_session, created["id"]).last_used_at, _now())


def test_a_token_never_outlives_the_one_year_cap(make_user, client, db_session):
    _, headers = make_user()
    created = _create(client, headers)
    row = _row(db_session, created["id"])
    row.created_at = _now() - timedelta(days=364)
    row.expires_at = _now() + timedelta(days=1)
    row.last_used_at = None
    db_session.commit()
    created_at = row.created_at

    resp = client.get("/me", headers=_bearer(created["token"]))

    assert resp.status_code == 200
    # Idle expiry alone would say 90 days from now; the cap says ~1 day from now.
    assert _close(_row(db_session, created["id"]).expires_at, created_at + timedelta(days=365))


# --- disconnecting ---


def test_disconnecting_deletes_the_token_and_it_stops_working(make_user, client, db_session):
    _, headers = make_user()
    created = _create(client, headers)

    resp = client.delete(f"/me/tokens/{created['id']}", headers=headers)

    assert resp.status_code == 200
    assert _row(db_session, created["id"]) is None
    assert client.get("/me", headers=_bearer(created["token"])).status_code == 401


def test_you_cannot_disconnect_someone_elses_token(make_user, client, db_session):
    _, alice_headers = make_user(username="alice", email="alice@example.com")
    _, bob_headers = make_user(username="bob", email="bob@example.com")
    bobs = _create(client, bob_headers)

    resp = client.delete(f"/me/tokens/{bobs['id']}", headers=alice_headers)

    assert resp.status_code == 404
    assert _row(db_session, bobs["id"]) is not None


def test_a_missing_token_looks_the_same_as_someone_elses(make_user, client):
    # If these differed, the endpoint would reveal which ids exist.
    _, alice_headers = make_user(username="alice", email="alice@example.com")
    _, bob_headers = make_user(username="bob", email="bob@example.com")
    bobs = _create(client, bob_headers)

    someone_elses = client.delete(f"/me/tokens/{bobs['id']}", headers=alice_headers)
    missing = client.delete("/me/tokens/99999", headers=alice_headers)

    assert (someone_elses.status_code, someone_elses.json()) == (missing.status_code, missing.json())


# --- when the account changes ---


def test_resetting_a_password_disconnects_every_assistant(make_user, client, db_session):
    alice, alice_headers = make_user(username="alice", email="alice@example.com")
    bob, bob_headers = make_user(username="bob", email="bob@example.com")
    alices = _create(client, alice_headers)
    bobs = _create(client, bob_headers)
    raw_reset_token = "reset-token-for-alice"
    db_session.add(
        models.PasswordResetToken(
            user_id=alice["id"],
            token_hash=hash_reset_token(raw_reset_token),
            expires_at=_now() + timedelta(minutes=30),
        )
    )
    db_session.commit()

    resp = client.post(
        "/password-reset/confirm",
        json={"token": raw_reset_token, "new_password": "a-brand-new-password"},
    )

    assert resp.status_code == 200
    assert client.get("/me", headers=_bearer(alices["token"])).status_code == 401
    # Only the account that reset its password was affected.
    assert client.get("/me", headers=_bearer(bobs["token"])).status_code == 200


def test_deleting_the_account_deletes_its_tokens(make_user, client, db_session):
    _, headers = make_user()
    _create(client, headers)

    assert client.delete("/me", headers=headers).status_code == 200

    assert db_session.query(models.PersonalAccessToken).count() == 0
