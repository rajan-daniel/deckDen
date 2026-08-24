def test_signup_creates_user_without_leaking_password(client):
    resp = client.post(
        "/signup",
        json={"username": "alice", "email": "alice@example.com", "password": "hunter2222"},
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["username"] == "alice"
    assert body["email"] == "alice@example.com"
    assert "password" not in body
    assert "hashed_password" not in body


def test_signup_rejects_duplicate_email(client):
    client.post(
        "/signup",
        json={"username": "alice", "email": "alice@example.com", "password": "hunter2222"},
    )

    resp = client.post(
        "/signup",
        json={"username": "someone-else", "email": "alice@example.com", "password": "hunter2222"},
    )

    assert resp.status_code == 400


def test_signup_rejects_duplicate_username(client):
    client.post(
        "/signup",
        json={"username": "alice", "email": "alice@example.com", "password": "hunter2222"},
    )

    resp = client.post(
        "/signup",
        json={"username": "alice", "email": "different@example.com", "password": "hunter2222"},
    )

    assert resp.status_code == 400


def test_login_with_correct_credentials_returns_token(make_user, client):
    make_user(email="alice@example.com", password="hunter2222")

    resp = client.post("/login", json={"email": "alice@example.com", "password": "hunter2222"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_with_wrong_password_rejected(make_user, client):
    make_user(email="alice@example.com", password="hunter2222")

    resp = client.post("/login", json={"email": "alice@example.com", "password": "wrong-password"})

    assert resp.status_code == 401


def test_login_with_unknown_email_rejected(client):
    resp = client.post("/login", json={"email": "nobody@example.com", "password": "hunter2222"})

    assert resp.status_code == 401


def test_me_requires_a_token(client):
    resp = client.get("/me")

    assert resp.status_code == 401


def test_me_rejects_a_garbage_token(client):
    resp = client.get("/me", headers={"Authorization": "Bearer not-a-real-token"})

    assert resp.status_code == 401


def test_me_returns_the_authenticated_user(make_user, client):
    user, headers = make_user()

    resp = client.get("/me", headers=headers)

    assert resp.status_code == 200
    assert resp.json()["id"] == user["id"]


def test_delete_account_removes_the_user(make_user, client):
    _, headers = make_user()

    resp = client.delete("/me", headers=headers)
    assert resp.status_code == 200

    # The token now refers to a user that no longer exists.
    resp = client.get("/me", headers=headers)
    assert resp.status_code == 401
