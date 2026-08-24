import asyncio

import httpx
import pytest
from fastapi import HTTPException

import app.main as main_module


def test_search_requires_at_least_two_characters(client, monkeypatch):
    calls = []

    async def fake_fetch(query):
        calls.append(query)
        return []

    monkeypatch.setattr(main_module, "_fetch_pokemon_cards", fake_fetch)

    resp = client.get("/card-search/pokemon", params={"q": "a"})

    assert resp.status_code == 200
    assert resp.json() == []
    # A too-short query should short-circuit before ever calling out to the
    # Pokemon TCG API - no point spending rate-limit quota on it.
    assert calls == []


def test_search_normalizes_matches(client, monkeypatch):
    async def fake_fetch(query):
        assert query == "pikachu"
        return [{"id": "base1-58", "name": "Pikachu", "images": {"small": "https://x/pika.png"}}]

    monkeypatch.setattr(main_module, "_fetch_pokemon_cards", fake_fetch)

    resp = client.get("/card-search/pokemon", params={"q": "pikachu"})

    assert resp.status_code == 200
    assert resp.json() == [{"name": "Pikachu", "externalId": "base1-58", "imageUrl": "https://x/pika.png"}]


def test_search_defaults_to_empty_image_when_missing(client, monkeypatch):
    async def fake_fetch(query):
        return [{"id": "base1-1", "name": "No Image Card", "images": {}}]

    monkeypatch.setattr(main_module, "_fetch_pokemon_cards", fake_fetch)

    resp = client.get("/card-search/pokemon", params={"q": "no image"})

    assert resp.json()[0]["imageUrl"] == ""


def test_search_surfaces_upstream_failure_as_502(client, monkeypatch):
    async def fake_fetch(query):
        raise HTTPException(status_code=502, detail="Pokemon card search failed")

    monkeypatch.setattr(main_module, "_fetch_pokemon_cards", fake_fetch)

    resp = client.get("/card-search/pokemon", params={"q": "pikachu"})

    assert resp.status_code == 502


def test_fetch_pokemon_cards_converts_a_timeout_into_a_clean_502(monkeypatch):
    # This is the actual bug a live check against the running dev server
    # turned up: httpx.AsyncClient.get can raise (timeout, connection
    # failure) rather than just returning a bad status code, and the
    # unauthenticated Pokemon TCG API does this often enough in practice
    # that it can't be allowed to crash the request as a raw 500.
    async def fake_get(self, *args, **kwargs):
        raise httpx.ReadTimeout("timed out")

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(main_module._fetch_pokemon_cards("pikachu"))

    assert exc_info.value.status_code == 502


def test_fetch_pokemon_cards_converts_a_bad_status_into_a_clean_502(monkeypatch):
    async def fake_get(self, *args, **kwargs):
        return httpx.Response(status_code=500, request=httpx.Request("GET", "https://x"))

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(main_module._fetch_pokemon_cards("pikachu"))

    assert exc_info.value.status_code == 502
