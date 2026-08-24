from app import models


def test_search_requires_at_least_two_characters(client):
    resp = client.get("/users/search", params={"q": "a"})

    assert resp.status_code == 200
    assert resp.json() == []


def test_search_matches_partial_username(make_user, client):
    make_user(username="alice", email="alice@example.com")
    make_user(username="alicia", email="alicia@example.com")
    make_user(username="bob", email="bob@example.com")

    resp = client.get("/users/search", params={"q": "ali"})

    usernames = {u["username"] for u in resp.json()}
    assert usernames == {"alice", "alicia"}


def test_search_is_case_insensitive(make_user, client):
    make_user(username="Alice", email="alice@example.com")

    resp = client.get("/users/search", params={"q": "ALI"})

    assert [u["username"] for u in resp.json()] == ["Alice"]


def test_get_user_public_decks_404s_for_unknown_user(client):
    resp = client.get("/users/nobody/decks")
    assert resp.status_code == 404


def test_get_user_public_decks_excludes_private_decks(make_user, client):
    _, headers = make_user(username="alice", email="alice@example.com")
    client.post(
        "/decks",
        json={"name": "Public Deck", "game": "Pokemon", "is_public": True},
        headers=headers,
    )
    client.post(
        "/decks",
        json={"name": "Private Deck", "game": "Pokemon", "is_public": False},
        headers=headers,
    )

    resp = client.get("/users/alice/decks")

    names = [d["name"] for d in resp.json()]
    assert names == ["Public Deck"]


def test_union_arena_search_requires_at_least_two_characters(client):
    resp = client.get("/card-search/union-arena", params={"q": "a"})

    assert resp.status_code == 200
    assert resp.json() == []


def test_union_arena_search_matches_name_or_card_code(client, db_session):
    db_session.add_all(
        [
            models.UnionArenaCard(card_code="UA01BT-001", name="Monkey D. Luffy", image_url="https://x/luffy.png"),
            models.UnionArenaCard(card_code="UA02BT-045", name="Roronoa Zoro", image_url=None),
        ]
    )
    db_session.commit()

    by_name = client.get("/card-search/union-arena", params={"q": "luffy"})
    by_code = client.get("/card-search/union-arena", params={"q": "UA02BT"})

    assert [c["name"] for c in by_name.json()] == ["Monkey D. Luffy"]
    assert by_name.json()[0]["imageUrl"] == "https://x/luffy.png"
    assert [c["name"] for c in by_code.json()] == ["Roronoa Zoro"]
    # A card with no image should surface as "" rather than null, since the
    # frontend renders this straight into an <img> src.
    assert by_code.json()[0]["imageUrl"] == ""
