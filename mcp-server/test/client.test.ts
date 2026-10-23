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

// A fake fetch for a status that only a misbehaving server sends (new Response refuses 600+).
function oddStatusFetch(status: number) {
  return vi.fn(
    async (_url: string | URL | Request, _init?: RequestInit): Promise<Response> => {
      const response = new Response("{}", { status: 200 });
      Object.defineProperty(response, "status", { value: status });
      Object.defineProperty(response, "ok", { value: false });
      return response;
    },
  );
}

// A fake fetch that fails with exactly the error it is given.
function rejectingFetch(error: Error) {
  return vi.fn(
    async (_url: string | URL | Request, _init?: RequestInit): Promise<Response> => {
      throw error;
    },
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

  it.each([500, 502, 503, 599])(
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

  it.each([500, 502, 503, 599])(
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

  const unexpectedStatusMessage = (status: number) =>
    `DeckDen answered with an unexpected status (${status}).`;

  describe.each(endpoints)("%s unexpected statuses", (_name, call) => {
    it.each([302, 403, 429, 499])(
      "turns a %i into a bad_response ApiError that names the status",
      async (status) => {
        const client = createClient(config, fakeFetch(status, { detail: "Something else" }));

        const error = await call(client).catch((e) => e);

        expect(error).toBeInstanceOf(ApiError);
        expect(error.kind).toBe("bad_response");
        expect(error.message).toBe(unexpectedStatusMessage(status));
      },
    );

    it("turns a status above 599 into a bad_response ApiError that names the status", async () => {
      const client = createClient(config, oddStatusFetch(600));

      const error = await call(client).catch((e) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect(error.kind).toBe("bad_response");
      expect(error.message).toBe(unexpectedStatusMessage(600));
    });
  });

  it("listMyDecks treats a 404 as an unexpected status", async () => {
    const client = createClient(config, fakeFetch(404, { detail: "Not Found" }));

    const error = await client.listMyDecks().catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.kind).toBe("bad_response");
    expect(error.message).toBe(unexpectedStatusMessage(404));
  });

  describe("errors never leak the token", () => {
    // The "dd_pat_" prefix is public. Only the random part after it is secret.
    const SECRET_BODY = "Zq9Xv7KpL2mW";
    const SECRET = `dd_pat_${SECRET_BODY}`;
    const WINDOW = 6;
    const secretConfig = { apiUrl: "https://api.example.com", token: SECRET };

    // The whole secret, plus every WINDOW-long piece of its random part,
    // so a partial leak is caught too.
    function leakedPieces(text: string): string[] {
      const pieces = [SECRET];
      for (let i = 0; i + WINDOW <= SECRET_BODY.length; i++) {
        pieces.push(SECRET_BODY.slice(i, i + WINDOW));
      }
      return pieces.filter((piece) => text.includes(piece));
    }

    it("flags a message that leaks, and passes one that does not", () => {
      expect(leakedPieces(`bad token ${SECRET}`)).not.toEqual([]);
      expect(leakedPieces(`starts with ${SECRET_BODY.slice(0, 8)}`)).not.toEqual([]);
      expect(leakedPieces("DeckDen didn't accept the token.")).toEqual([]);
    });

    // Every failure is built so that the body or the original error carries the secret.
    const cases: Array<[string, typeof fetch]> = [
      ["a 401 whose body echoes the token", fakeFetch(401, { detail: `Invalid ${SECRET}` })],
      ["a 404 whose body echoes the token", fakeFetch(404, { detail: `Missing ${SECRET}` })],
      ["a 500 whose body echoes the token", fakeFetch(500, { detail: `Crashed ${SECRET}` })],
      ["a 403 whose body echoes the token", fakeFetch(403, { detail: `Forbidden ${SECRET}` })],
      ["a reply that is not JSON and starts with the token", textFetch(200, `${SECRET_BODY} <html>`)],
      ["JSON of the wrong shape that carries the token", fakeFetch(200, { token: SECRET })],
      ["a network failure whose message holds the token", rejectingFetch(new TypeError(`failed ${SECRET}`))],
      ["a timeout whose message holds the token", rejectingFetch(new DOMException(`timeout ${SECRET}`, "TimeoutError"))],
      ["a body that stalls with the token in its message", brokenBodyFetch(new DOMException(`timeout ${SECRET}`, "TimeoutError"))],
      ["a connection that drops with the token in its message", brokenBodyFetch(new TypeError(`terminated ${SECRET}`))],
    ];

    describe.each(endpoints)("%s", (_name, call) => {
      it.each(cases)("%s", async (_label, fetchImpl) => {
        const client = createClient(secretConfig, fetchImpl);

        const error = await call(client).catch((e) => e);

        expect(error).toBeInstanceOf(ApiError);
        expect(leakedPieces(error.message)).toEqual([]);
        expect(error.cause).toBeUndefined();
      });
    });
  });
});
