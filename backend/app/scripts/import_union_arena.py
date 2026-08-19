"""Populates the union_arena_cards table from the official Union Arena TCG
card list (unionarena-tcg.com). No public API exists for this game — that's
exactly why this table exists — so this scrapes the same public,
server-rendered card list page a visitor's browser would load. Nothing here
is behind auth, and the site has no robots.txt restricting it.

This is a one-off/re-runnable maintenance script, not part of the live app.
Run it manually whenever you want to (re-)populate the database — the
initial run, or again whenever a new set releases. It's always safe to
re-run: every card is upserted by its card_code, so running it twice never
creates duplicates, and existing rows just get refreshed.

Usage (from the host machine, with the stack running via docker compose):
    docker exec -it deckden-api python -m app.scripts.import_union_arena
"""

import time
from urllib.parse import urljoin, urlparse, parse_qs

import httpx
from bs4 import BeautifulSoup
from sqlalchemy.dialects.postgresql import insert

from app.database import SessionLocal
from app.models import UnionArenaCard

BASE_URL = "https://www.unionarena-tcg.com"
CARD_LIST_URL = f"{BASE_URL}/na/cardlist/"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    )
}
REQUEST_DELAY_SECONDS = 0.3


def discover_series(client: httpx.Client) -> list[tuple[str, str]]:
    """Reads the "series" dropdown on the card list page instead of using a
    hardcoded set list, so a newly-released set gets picked up automatically
    the next time this script runs."""
    resp = client.get(CARD_LIST_URL, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    select = soup.find("select", id="series")
    series = []
    for option in select.find_all("option"):
        value = option.get("value", "").strip()
        label = option.get_text(strip=True)
        if value.isdigit():
            series.append((value, label))
    return series


def parse_cards(html_text: str) -> list[dict]:
    soup = BeautifulSoup(html_text, "html.parser")
    cards = []

    for li in soup.select("li.cardImgCol"):
        link = li.find("a")
        img = li.find("img")
        if not link or not img:
            continue

        href = link.get("href", "")
        card_code = parse_qs(urlparse(href).query).get("card_no", [None])[0]

        image_url = img.get("data-src") or img.get("src")
        alt_text = img.get("alt", "").strip()

        if not card_code or not image_url:
            continue

        # alt text is "{card_code} {name}" — strip the code back off.
        if alt_text.startswith(card_code):
            name = alt_text[len(card_code):].strip()
        else:
            name = alt_text
        if not name:
            name = card_code

        cards.append({
            "card_code": card_code,
            "name": name,
            "image_url": urljoin(BASE_URL, image_url),
        })

    return cards


def upsert_cards(db, cards: list[dict]) -> int:
    if not cards:
        return 0

    stmt = insert(UnionArenaCard).values(cards)
    stmt = stmt.on_conflict_do_update(
        index_elements=["card_code"],
        set_={"name": stmt.excluded.name, "image_url": stmt.excluded.image_url},
    )
    db.execute(stmt)
    db.commit()
    return len(cards)


def main():
    db = SessionLocal()
    total = 0

    try:
        with httpx.Client(follow_redirects=True) as client:
            series_list = discover_series(client)
            print(f"Found {len(series_list)} series to import.\n")

            for series_id, label in series_list:
                resp = client.get(
                    CARD_LIST_URL,
                    params={"search": "true", "series": series_id},
                    headers=HEADERS,
                    timeout=15,
                )
                resp.raise_for_status()

                cards = parse_cards(resp.text)
                upsert_cards(db, cards)
                total += len(cards)

                print(f"  {label} [{series_id}] -> {len(cards)} cards")
                time.sleep(REQUEST_DELAY_SECONDS)
    finally:
        db.close()

    print(f"\nDone. {total} cards imported/updated.")


if __name__ == "__main__":
    main()
