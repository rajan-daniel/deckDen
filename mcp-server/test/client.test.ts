import { describe, expect, it, vi } from "vitest";
import { createClient } from "../src/client.js";

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