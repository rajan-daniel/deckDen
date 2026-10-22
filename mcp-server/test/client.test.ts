import { describe, expect, it, vi } from "vitest";
import { ApiError, createClient } from "../src/client.js";

const config = { apiUrl: "https://api.example.com", token: "dd_pat_abc123" };

// A fake fetch that answers every request with the given status and JSON body.
function fakeFetch(status: number, body: unknown) {
  return vi.fn(
    async (_url: string | URL | Request, _init?: RequestInit) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  );
}

describe("listMyDecks", () => {
  it("calls GET /me/decks with the token in the Authorization header", async () => {
    const fetchMock = fakeFetch(200, []);
    const client = createClient(config, fetchMock);

    await client.listMyDecks();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.example.com/me/decks");
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer dd_pat_abc123",
    );
  });
});

// What the backend really sends for GET /me/decks (DeckSummaryResponse).
const rawSummary = {
  id: 7,
  name: "Bleach Aggro",
  game: "Union Arena",
  format: "Standard",
  play_style: "Aggro",
  description: "Fast rush deck",
  is_public: false,
  owner_id: 3,
  owner_username: "alice",
  preview_image_url: "https://example.com/card.png",
  card_count: 50,
};

describe("listMyDecks results", () => {
  it("returns the decks with only the fields the assistant needs", async () => {
    const client = createClient(config, fakeFetch(200, [rawSummary]));

    const decks = await client.listMyDecks();

    expect(decks).toEqual([
      {
        id: 7,
        name: "Bleach Aggro",
        game: "Union Arena",
        format: "Standard",
        play_style: "Aggro",
        description: "Fast rush deck",
        is_public: false,
        card_count: 50,
      },
    ]);
  });
});

// What the backend really sends for GET /me/decks/{id} (DeckWithCardsResponse).
const rawDeck = {
  id: 7,
  name: "Bleach Aggro",
  game: "Union Arena",
  format: "Standard",
  play_style: "Aggro",
  description: "Fast rush deck",
  is_public: false,
  owner_id: 3,
  cards: [
    {
      id: 101,
      deck_id: 7,
      card_name: "Uryu Ishida",
      external_card_id: "UE01ST/BLC-1-034",
      image_url: "https://example.com/card.png",
      quantity: 4,
      category: "Character",
      notes: "Main attacker",
    },
  ],
};

describe("getMyDeck", () => {
  it("calls GET /me/decks/{id} with the token in the Authorization header", async () => {
    const fetchMock = fakeFetch(200, rawDeck);
    const client = createClient(config, fetchMock);

    await client.getMyDeck(7);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.example.com/me/decks/7");
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer dd_pat_abc123",
    );
  });

  it("returns the deck with only the fields the assistant needs", async () => {
    const client = createClient(config, fakeFetch(200, rawDeck));

    const deck = await client.getMyDeck(7);

    expect(deck).toEqual({
      id: 7,
      name: "Bleach Aggro",
      game: "Union Arena",
      format: "Standard",
      play_style: "Aggro",
      description: "Fast rush deck",
      is_public: false,
      cards: [
        {
          card_name: "Uryu Ishida",
          external_card_id: "UE01ST/BLC-1-034",
          quantity: 4,
          category: "Character",
          notes: "Main attacker",
        },
      ],
    });
  });

  it.each([0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
    "rejects the id %s before making any request",
    async (id) => {
      const fetchMock = fakeFetch(200, rawDeck);
      const client = createClient(config, fetchMock);

      await expect(client.getMyDeck(id)).rejects.toThrow(RangeError);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});

describe("errors", () => {
  it("turns a 401 into an unauthorized ApiError with a friendly message", async () => {
    const client = createClient(
      config,
      fakeFetch(401, { detail: "Invalid authentication token" }),
    );

    const error = await client.listMyDecks().catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.kind).toBe("unauthorized");
    expect(error.message).toBe(
      "DeckDen didn't accept the token. Create a new one on your account page.",
    );
  });

  it("turns a 404 into a not_found ApiError with a friendly message", async () => {
    const client = createClient(
      config,
      fakeFetch(404, { detail: "Deck not found" }),
    );

    const error = await client.getMyDeck(7).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.kind).toBe("not_found");
    expect(error.message).toBe("Deck not found.");
  });
});
