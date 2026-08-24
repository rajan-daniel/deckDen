def _create_deck(client, headers, **overrides):
    payload = {"name": "Fire Deck", "game": "Pokemon", "is_public": True}
    payload.update(overrides)
    resp = client.post("/decks", json=payload, headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json()


def _add_card(client, headers, deck_id, **overrides):
    payload = {"card_name": "Pikachu", "quantity": 2}
    payload.update(overrides)
    resp = client.post(f"/decks/{deck_id}/cards", json=payload, headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_owner_can_add_card_to_deck(make_user, client):
    _, headers = make_user()
    deck = _create_deck(client, headers)

    card = _add_card(client, headers, deck["id"], card_name="Pikachu", quantity=4)

    assert card["card_name"] == "Pikachu"
    assert card["quantity"] == 4
    assert card["deck_id"] == deck["id"]


def test_non_owner_cannot_add_card_to_deck(make_user, client):
    _, alice_headers = make_user(username="alice", email="alice@example.com")
    _, bob_headers = make_user(username="bob", email="bob@example.com")
    deck = _create_deck(client, alice_headers)

    resp = client.post(
        f"/decks/{deck['id']}/cards",
        json={"card_name": "Pikachu", "quantity": 1},
        headers=bob_headers,
    )

    assert resp.status_code == 403


def test_add_card_to_nonexistent_deck_404s(make_user, client):
    _, headers = make_user()

    resp = client.post(
        "/decks/999999/cards", json={"card_name": "Pikachu", "quantity": 1}, headers=headers
    )

    assert resp.status_code == 404


def test_get_deck_cards_works_for_public_deck_with_no_auth(make_user, client):
    _, headers = make_user()
    deck = _create_deck(client, headers, is_public=True)
    _add_card(client, headers, deck["id"])

    resp = client.get(f"/decks/{deck['id']}/cards")

    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_get_deck_cards_404s_for_private_deck(make_user, client):
    _, headers = make_user()
    deck = _create_deck(client, headers, is_public=False)
    _add_card(client, headers, deck["id"])

    resp = client.get(f"/decks/{deck['id']}/cards")

    assert resp.status_code == 404


def test_owner_can_update_card(make_user, client):
    _, headers = make_user()
    deck = _create_deck(client, headers)
    card = _add_card(client, headers, deck["id"], quantity=1)

    resp = client.put(
        f"/decks/{deck['id']}/cards/{card['id']}", json={"quantity": 3}, headers=headers
    )

    assert resp.status_code == 200
    assert resp.json()["quantity"] == 3


def test_non_owner_cannot_update_card(make_user, client):
    _, alice_headers = make_user(username="alice", email="alice@example.com")
    _, bob_headers = make_user(username="bob", email="bob@example.com")
    deck = _create_deck(client, alice_headers)
    card = _add_card(client, alice_headers, deck["id"])

    resp = client.put(
        f"/decks/{deck['id']}/cards/{card['id']}", json={"quantity": 99}, headers=bob_headers
    )

    assert resp.status_code == 403


def test_update_card_that_belongs_to_a_different_deck_404s(make_user, client):
    _, headers = make_user()
    deck_a = _create_deck(client, headers, name="Deck A")
    deck_b = _create_deck(client, headers, name="Deck B")
    card = _add_card(client, headers, deck_a["id"])

    resp = client.put(
        f"/decks/{deck_b['id']}/cards/{card['id']}", json={"quantity": 5}, headers=headers
    )

    assert resp.status_code == 404


def test_owner_can_delete_card(make_user, client):
    _, headers = make_user()
    deck = _create_deck(client, headers)
    card = _add_card(client, headers, deck["id"])

    resp = client.delete(f"/decks/{deck['id']}/cards/{card['id']}", headers=headers)
    assert resp.status_code == 200

    remaining = client.get(f"/decks/{deck['id']}/cards")
    assert remaining.json() == []


def test_non_owner_cannot_delete_card(make_user, client):
    _, alice_headers = make_user(username="alice", email="alice@example.com")
    _, bob_headers = make_user(username="bob", email="bob@example.com")
    deck = _create_deck(client, alice_headers)
    card = _add_card(client, alice_headers, deck["id"])

    resp = client.delete(f"/decks/{deck['id']}/cards/{card['id']}", headers=bob_headers)

    assert resp.status_code == 403


def test_card_quantity_must_be_positive(make_user, client):
    _, headers = make_user()
    deck = _create_deck(client, headers)

    resp = client.post(
        f"/decks/{deck['id']}/cards",
        json={"card_name": "Pikachu", "quantity": 0},
        headers=headers,
    )

    assert resp.status_code == 422
