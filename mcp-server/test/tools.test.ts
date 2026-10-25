import type { CallToolResult } from "@modelcontextprotocol/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, createClient } from "../src/client.js";
import {
  getDeckInput,
  handleGetDeck,
  handleListMyDecks,
  listMyDecksInput,
  type DeckClient,
} from "../src/tools.js";

const summary = {
  id: 7,
  name: "Bleach Aggro",
  game: "Union Arena",
  format: "Standard",
  play_style: "Aggro",
  description: "Fast rush deck",
  is_public: false,
  card_count: 50,
};

const deck = {
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
};

// A fake client. Each method answers with sample data unless the test overrides it.
function fakeClient(overrides: Partial<DeckClient> = {}): DeckClient {
  return {
    listMyDecks: vi.fn(async () => [summary]),
    getMyDeck: vi.fn(async () => deck),
    ...overrides,
  };
}

// The text of a result's only content block.
function textOf(result: CallToolResult): string {
  expect(result.content).toHaveLength(1);
  const block = result.content[0]!;
  if (block.type !== "text") {
    throw new Error("expected a text block");
  }
  return block.text;
}

let errorSpy: ReturnType<typeof vi.spyOn>;
let stdoutSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("list_my_decks", () => {
  it("returns the decks as compact JSON in one text block", async () => {
    const client = fakeClient();

    const result = await handleListMyDecks(client);

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toBe(JSON.stringify([summary]));
    expect(client.listMyDecks).toHaveBeenCalledTimes(1);
  });

  it("returns an empty array when the user has no decks", async () => {
    const client = fakeClient({ listMyDecks: vi.fn(async () => []) });

    const result = await handleListMyDecks(client);

    expect(textOf(result)).toBe("[]");
  });

  it("accepts no arguments", () => {
    expect(listMyDecksInput.safeParse({}).success).toBe(true);
  });
});

describe("get_deck", () => {
  it("returns the deck as compact JSON in one text block", async () => {
    const client = fakeClient();

    const result = await handleGetDeck(client, { deck_id: 7 });

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toBe(JSON.stringify(deck));
    expect(client.getMyDeck).toHaveBeenCalledWith(7);
  });
});

describe("get_deck input", () => {
  it("accepts a whole number above 0", () => {
    expect(getDeckInput.safeParse({ deck_id: 7 }).success).toBe(true);
  });

  it.each(["abc", "7", -4, 0, 3.5, null, undefined])(
    "rejects deck_id %s",
    (deck_id) => {
      expect(getDeckInput.safeParse({ deck_id }).success).toBe(false);
    },
  );

  it("rejects a missing deck_id", () => {
    expect(getDeckInput.safeParse({}).success).toBe(false);
  });
});

describe("errors from the API client", () => {
  it.each([
    ["a 401", new ApiError("unauthorized", "DeckDen didn't accept the token.")],
    ["a network error", new ApiError("network", "Couldn't reach DeckDen at https://api.example.com.")],
  ])("list_my_decks turns %s into an error result with the client's message", async (_name, error) => {
    const client = fakeClient({ listMyDecks: vi.fn().mockRejectedValue(error) });

    const result = await handleListMyDecks(client);

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe(error.message);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it.each([
    ["a 401", new ApiError("unauthorized", "DeckDen didn't accept the token.")],
    ["a 404", new ApiError("not_found", "Deck not found.")],
    ["a network error", new ApiError("network", "Couldn't reach DeckDen at https://api.example.com.")],
  ])("get_deck turns %s into an error result with the client's message", async (_name, error) => {
    const client = fakeClient({ getMyDeck: vi.fn().mockRejectedValue(error) });

    const result = await handleGetDeck(client, { deck_id: 7 });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe(error.message);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe("unexpected failures", () => {
  it("answers with a generic message and logs only the name and message to stderr", async () => {
    const error = new TypeError("something odd happened");
    const client = fakeClient({ getMyDeck: vi.fn().mockRejectedValue(error) });

    const result = await handleGetDeck(client, { deck_id: 7 });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe(
      "Something went wrong while reading from DeckDen. Try again shortly.",
    );
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      "Unexpected error in a tool: TypeError: something odd happened",
    );
  });

  it("never shows the model the raw error message", async () => {
    const error = new Error("connect ECONNREFUSED 10.0.0.5:8000");
    const client = fakeClient({ listMyDecks: vi.fn().mockRejectedValue(error) });

    const result = await handleListMyDecks(client);

    expect(textOf(result)).not.toContain("ECONNREFUSED");
  });

  it("cuts anything shaped like a token out of what it logs", async () => {
    const error = new Error("request failed, Authorization: Bearer dd_pat_secret-123_ABC");
    const client = fakeClient({ getMyDeck: vi.fn().mockRejectedValue(error) });

    const result = await handleGetDeck(client, { deck_id: 7 });

    expect(textOf(result)).not.toContain("dd_pat_");
    const logged = String(errorSpy.mock.calls[0]![0]);
    expect(logged).not.toContain("dd_pat_");
    expect(logged).not.toContain("secret-123");
    expect(logged).toContain("[redacted]");
  });

  it("does not log the error's cause or any other property", async () => {
    const error = new Error("outer", { cause: { headers: { Authorization: "Bearer dd_pat_x" } } });
    const client = fakeClient({ getMyDeck: vi.fn().mockRejectedValue(error) });

    await handleGetDeck(client, { deck_id: 7 });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0]).toHaveLength(1);
    expect(typeof errorSpy.mock.calls[0]![0]).toBe("string");
  });

  it("copes with a thrown value that is not an Error", async () => {
    const client = fakeClient({ listMyDecks: vi.fn().mockRejectedValue("dd_pat_oops") });

    const result = await handleListMyDecks(client);

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe(
      "Something went wrong while reading from DeckDen. Try again shortly.",
    );
    expect(String(errorSpy.mock.calls[0]![0])).not.toContain("dd_pat_");
  });

  it("copes with a RangeError from the client (a bad id that got past the schema)", async () => {
    const client = fakeClient({
      getMyDeck: vi.fn().mockRejectedValue(new RangeError("deck id must be a positive whole number")),
    });

    const result = await handleGetDeck(client, { deck_id: 7 });

    expect(result.isError).toBe(true);
    expect(textOf(result)).not.toContain("positive whole number");
  });
});

describe("stdout", () => {
  it("is never written to, on success or failure", async () => {
    await handleListMyDecks(fakeClient());
    await handleGetDeck(fakeClient(), { deck_id: 7 });
    await handleGetDeck(
      fakeClient({ getMyDeck: vi.fn().mockRejectedValue(new ApiError("not_found", "Deck not found.")) }),
      { deck_id: 7 },
    );
    await handleGetDeck(
      fakeClient({ getMyDeck: vi.fn().mockRejectedValue(new Error("boom")) }),
      { deck_id: 7 },
    );

    expect(stdoutSpy).not.toHaveBeenCalled();
  });
});

// The real client and the real handlers, with only fetch faked. The backend sends more than
// the assistant should see (owner info, image URLs), so this shows what the model really gets.
describe("fields the assistant must not see", () => {
  const config = { apiUrl: "https://api.example.com", token: "dd_pat_abc123" };

  function fakeFetch(body: unknown) {
    return vi.fn(
      async (_url: string | URL | Request, _init?: RequestInit) =>
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
  }

  const unwanted = [
    "owner_id",
    "owner_username",
    "preview_image_url",
    "image_url",
    "alice",
    "example.com/card.png",
  ];

  it("list_my_decks leaves out owner info and image URLs", async () => {
    const client = createClient(
      config,
      fakeFetch([
        {
          ...summary,
          owner_id: 3,
          owner_username: "alice",
          preview_image_url: "https://example.com/card.png",
        },
      ]),
    );

    const result = await handleListMyDecks(client);

    const text = textOf(result);
    expect(JSON.parse(text)).toEqual([summary]);
    for (const needle of unwanted) {
      expect(text).not.toContain(needle);
    }
  });

  it("get_deck leaves out owner info and image URLs", async () => {
    const client = createClient(
      config,
      fakeFetch({
        ...deck,
        owner_id: 3,
        cards: [
          {
            ...deck.cards[0],
            id: 101,
            deck_id: 7,
            image_url: "https://example.com/card.png",
          },
        ],
      }),
    );

    const result = await handleGetDeck(client, { deck_id: 7 });

    const text = textOf(result);
    expect(JSON.parse(text)).toEqual(deck);
    for (const needle of unwanted) {
      expect(text).not.toContain(needle);
    }
  });

  it("a real 401 from the backend reaches the model as the client's fixed message", async () => {
    const client = createClient(
      config,
      vi.fn(async () => new Response("nope", { status: 401 })),
    );

    const result = await handleGetDeck(client, { deck_id: 7 });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe(
      "DeckDen didn't accept the token. Create a new one on your account page.",
    );
    expect(textOf(result)).not.toContain("dd_pat_");
  });
});
