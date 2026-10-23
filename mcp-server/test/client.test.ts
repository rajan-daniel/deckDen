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

// A fake fetch that fails the way a real one does when it gets no response.
function networkDownFetch() {
  return vi.fn(
    async (_url: string | URL | Request, _init?: RequestInit): Promise<Response> => {
      throw new TypeError("fetch failed");
    },
  );
}

// A fake fetch that fails the way a real one does when AbortSignal.timeout fires.
function timedOutFetch() {
  return vi.fn(
    async (_url: string | URL | Request, _init?: RequestInit): Promise<Response> => {
      throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
    },
  );
}

// A fake fetch that answers with plain text instead of JSON.
function textFetch(status: number, text: string) {
  return vi.fn(
    async (_url: string | URL | Request, _init?: RequestInit): Promise<Response> =>
      new Response(text, { status, headers: { "Content-Type": "text/html" } }),
  );
}

// A fake fetch whose headers arrive fine but whose body fails while it is read.
function brokenBodyFetch(error: Error) {
  return vi.fn(
    async (_url: string | URL | Request, _init?: RequestInit): Promise<Response> =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.error(error);
          },
        }),
        { status: 200 },
      ),
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
  it("listMyDecks turns a 401 into an unauthorized ApiError with a friendly message", async () => {
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

  it("getMyDeck turns a 404 into a not_found ApiError with a friendly message", async () => {
    const client = createClient(
      config,
      fakeFetch(404, { detail: "Deck not found" }),
    );

    const error = await client.getMyDeck(7).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.kind).toBe("not_found");
    expect(error.message).toBe("Deck not found.");
  });

  it("getMyDeck turns a 401 into an unauthorized ApiError with a friendly message", async () => {
    const client = createClient(
      config,
      fakeFetch(401, { detail: "Invalid authentication token" }),
    );

    const error = await client.getMyDeck(7).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.kind).toBe("unauthorized");
    expect(error.message).toBe(
      "DeckDen didn't accept the token. Create a new one on your account page.",
    );
  });

  it.each([500, 502, 503])(
    "listMyDecks turns a %i into a server ApiError with a friendly message",
    async (status) => {
      const client = createClient(
        config,
        fakeFetch(status, { detail: "Internal Server Error" }),
      );

      const error = await client.listMyDecks().catch((e) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect(error.kind).toBe("server");
      expect(error.message).toBe(
        "DeckDen is having trouble. Try again shortly.",
      );
    },
  );

  it.each([500, 502, 503])(
    "getMyDeck turns a %i into a server ApiError with a friendly message",
    async (status) => {
      const client = createClient(
        config,
        fakeFetch(status, { detail: "Internal Server Error" }),
      );

      const error = await client.getMyDeck(7).catch((e) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect(error.kind).toBe("server");
      expect(error.message).toBe(
        "DeckDen is having trouble. Try again shortly.",
      );
    },
  );

  // The API URL has a path here so the message can only pass by naming the host alone.
  const apiUrlWithPath = { ...config, apiUrl: "https://api.example.com/deckden" };

  it("listMyDecks turns a network failure into a network ApiError that names the host", async () => {
    const client = createClient(apiUrlWithPath, networkDownFetch());

    const error = await client.listMyDecks().catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.kind).toBe("network");
    expect(error.message).toBe("Couldn't reach DeckDen at https://api.example.com.");
  });

  it("getMyDeck turns a network failure into a network ApiError that names the host", async () => {
    const client = createClient(apiUrlWithPath, networkDownFetch());

    const error = await client.getMyDeck(7).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.kind).toBe("network");
    expect(error.message).toBe("Couldn't reach DeckDen at https://api.example.com.");
  });

  it("listMyDecks turns a timeout into a timeout ApiError that names the host", async () => {
    const client = createClient(apiUrlWithPath, timedOutFetch());

    const error = await client.listMyDecks().catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.kind).toBe("timeout");
    expect(error.message).toBe(
      "DeckDen at https://api.example.com took too long to answer. Try again shortly.",
    );
  });

  it("getMyDeck turns a timeout into a timeout ApiError that names the host", async () => {
    const client = createClient(apiUrlWithPath, timedOutFetch());

    const error = await client.getMyDeck(7).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.kind).toBe("timeout");
    expect(error.message).toBe(
      "DeckDen at https://api.example.com took too long to answer. Try again shortly.",
    );
  });

  it("gives every request a 10 second timeout signal", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    const fetchMock = fakeFetch(200, []);
    const client = createClient(config, fetchMock);

    await client.listMyDecks();

    expect(timeoutSpy).toHaveBeenCalledWith(10_000);
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init?.signal).toBe(timeoutSpy.mock.results[0]!.value);
    timeoutSpy.mockRestore();
  });

  type Client = ReturnType<typeof createClient>;

  const endpoints: [string, (client: Client) => Promise<any>][] = [
    ["listMyDecks", (client) => client.listMyDecks()],
    ["getMyDeck", (client) => client.getMyDeck(7)],
  ];

  const unreadableMessage =
    "DeckDen sent a reply this server couldn't read. If it keeps happening, update the DeckDen MCP server.";

  describe.each(endpoints)("%s reading the body", (_name, call) => {
    it("turns a reply that is not JSON into a bad_response ApiError", async () => {
      const client = createClient(config, textFetch(200, "<html>Bad Gateway</html>"));

      const error = await call(client).catch((e) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect(error.kind).toBe("bad_response");
      expect(error.message).toBe(unreadableMessage);
    });

    it("turns JSON of the wrong shape into a bad_response ApiError", async () => {
      const client = createClient(config, fakeFetch(200, { unexpected: true }));

      const error = await call(client).catch((e) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect(error.kind).toBe("bad_response");
      expect(error.message).toBe(unreadableMessage);
    });

    it("turns a body that stalls into a timeout ApiError", async () => {
      const stalled = new DOMException("The operation was aborted due to timeout", "TimeoutError");
      const client = createClient(apiUrlWithPath, brokenBodyFetch(stalled));

      const error = await call(client).catch((e) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect(error.kind).toBe("timeout");
      expect(error.message).toBe(
        "DeckDen at https://api.example.com took too long to answer. Try again shortly.",
      );
    });

    it("turns a connection that drops mid-body into a network ApiError", async () => {
      const client = createClient(apiUrlWithPath, brokenBodyFetch(new TypeError("terminated")));

      const error = await call(client).catch((e) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect(error.kind).toBe("network");
      expect(error.message).toBe("Couldn't reach DeckDen at https://api.example.com.");
    });
  });
});
