def _create_deck(client, headers, **overrides):
    payload = {
        "name": "Fire Deck",
        "game": "Pokemon",
        "is_public": True,
    }
    payload.update(overrides)
    resp = client.post("/decks", json=payload, headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_create_deck_requires_auth(client):
    resp = client.post("/decks", json={"name": "Fire Deck", "game": "Pokemon"})
    assert resp.status_code == 401


def test_create_and_fetch_deck(make_user, client):
    _, headers = make_user()
    deck = _create_deck(client, headers, name="Fire Deck", game="Pokemon")

    resp = client.get(f"/me/decks/{deck['id']}", headers=headers)

    assert resp.status_code == 200
    assert resp.json()["name"] == "Fire Deck"
    assert resp.json()["cards"] == []


def test_get_my_decks_only_lists_own_decks(make_user, client):
    _, alice_headers = make_user(username="alice", email="alice@example.com")
    _, bob_headers = make_user(username="bob", email="bob@example.com")
    _create_deck(client, alice_headers, name="Alice Deck")
    _create_deck(client, bob_headers, name="Bob Deck")

    resp = client.get("/me/decks", headers=alice_headers)

    names = [d["name"] for d in resp.json()]
    assert names == ["Alice Deck"]


def test_get_my_deck_404s_for_someone_elses_deck(make_user, client):
    _, alice_headers = make_user(username="alice", email="alice@example.com")
    _, bob_headers = make_user(username="bob", email="bob@example.com")
    deck = _create_deck(client, alice_headers)

    resp = client.get(f"/me/decks/{deck['id']}", headers=bob_headers)

    assert resp.status_code == 404


def test_public_decks_endpoint_excludes_private_decks(make_user, client):
    _, headers = make_user()
    _create_deck(client, headers, name="Public Deck", is_public=True)
    _create_deck(client, headers, name="Private Deck", is_public=False)

    resp = client.get("/decks")

    names = [d["name"] for d in resp.json()]
    assert names == ["Public Deck"]


def test_public_decks_can_be_filtered_by_game(make_user, client):
    _, headers = make_user()
    _create_deck(client, headers, name="Pokemon Deck", game="Pokemon")
    _create_deck(client, headers, name="Yugioh Deck", game="Yu-Gi-Oh!")

    resp = client.get("/decks", params={"game": "Pokemon"})

    names = [d["name"] for d in resp.json()]
    assert names == ["Pokemon Deck"]


def test_get_public_deck_by_id_hides_private_decks(make_user, client):
    _, headers = make_user()
    deck = _create_deck(client, headers, is_public=False)

    resp = client.get(f"/decks/{deck['id']}")

    assert resp.status_code == 404


def test_get_public_deck_by_id_works_with_no_auth(make_user, client):
    _, headers = make_user()
    deck = _create_deck(client, headers, is_public=True)

    resp = client.get(f"/decks/{deck['id']}")

    assert resp.status_code == 200


def test_get_nonexistent_deck_404s(client):
    resp = client.get("/decks/999999")
    assert resp.status_code == 404


def test_owner_can_update_deck(make_user, client):
    _, headers = make_user()
    deck = _create_deck(client, headers, name="Old Name")

    resp = client.put(f"/decks/{deck['id']}", json={"name": "New Name"}, headers=headers)

    assert resp.status_code == 200
    assert resp.json()["name"] == "New Name"


def test_non_owner_cannot_update_deck(make_user, client):
    _, alice_headers = make_user(username="alice", email="alice@example.com")
    _, bob_headers = make_user(username="bob", email="bob@example.com")
    deck = _create_deck(client, alice_headers)

    resp = client.put(f"/decks/{deck['id']}", json={"name": "Hijacked"}, headers=bob_headers)

    assert resp.status_code == 403


def test_owner_can_delete_deck(make_user, client):
    _, headers = make_user()
    deck = _create_deck(client, headers)

    resp = client.delete(f"/decks/{deck['id']}", headers=headers)
    assert resp.status_code == 200

    resp = client.get(f"/me/decks/{deck['id']}", headers=headers)
    assert resp.status_code == 404


def test_non_owner_cannot_delete_deck(make_user, client):
    _, alice_headers = make_user(username="alice", email="alice@example.com")
    _, bob_headers = make_user(username="bob", email="bob@example.com")
    deck = _create_deck(client, alice_headers)

    resp = client.delete(f"/decks/{deck['id']}", headers=bob_headers)

    assert resp.status_code == 403


def test_deck_summary_reports_card_count_and_preview_image(make_user, client):
    _, headers = make_user()
    deck = _create_deck(client, headers)
    client.post(
        f"/decks/{deck['id']}/cards",
        json={"card_name": "Pikachu", "image_url": "https://example.com/pikachu.png", "quantity": 3},
        headers=headers,
    )
    client.post(
        f"/decks/{deck['id']}/cards",
        json={"card_name": "Charmander", "quantity": 1},
        headers=headers,
    )

    resp = client.get("/me/decks", headers=headers)

    summary = resp.json()[0]
    assert summary["card_count"] == 4
    assert summary["preview_image_url"] == "https://example.com/pikachu.png"
    assert summary["owner_username"] == "alice"
