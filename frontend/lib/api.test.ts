import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch, ApiError } from "./api";

function mockFetchOnce(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValue(response as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiFetch", () => {
  it("returns the parsed JSON body on success", async () => {
    mockFetchOnce({ ok: true, status: 200, json: async () => ({ id: 1 }) });

    const result = await apiFetch<{ id: number }>("/decks");

    expect(result).toEqual({ id: 1 });
  });

  it("sends a bearer token header when a token is provided", async () => {
    const fetchMock = mockFetchOnce({ ok: true, status: 200, json: async () => ({}) });

    await apiFetch("/me", { token: "abc123" });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer abc123");
  });

  it("omits the Authorization header when no token is given", async () => {
    const fetchMock = mockFetchOnce({ ok: true, status: 200, json: async () => ({}) });

    await apiFetch("/decks");

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });

  it("JSON-encodes the body when one is given", async () => {
    const fetchMock = mockFetchOnce({ ok: true, status: 200, json: async () => ({}) });

    await apiFetch("/decks", { method: "POST", body: { name: "My Deck" } });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.body).toBe(JSON.stringify({ name: "My Deck" }));
  });

  it("throws an ApiError carrying the status and backend detail message", async () => {
    mockFetchOnce({
      ok: false,
      status: 403,
      json: async () => ({ detail: "You do not have permission to edit this deck" }),
    });

    await expect(apiFetch("/decks/1")).rejects.toMatchObject({
      status: 403,
      message: "You do not have permission to edit this deck",
    });
  });

  it("throws an ApiError with a fallback message when the error body isn't JSON", async () => {
    mockFetchOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("not json");
      },
    });

    let error: ApiError | undefined;
    try {
      await apiFetch("/decks/1");
    } catch (e) {
      error = e as ApiError;
    }

    expect(error).toBeInstanceOf(ApiError);
    expect(error?.status).toBe(500);
    expect(error?.message).toBe("Something went wrong");
  });

  it("returns undefined for a 204 No Content response", async () => {
    mockFetchOnce({ ok: true, status: 204, json: async () => ({}) });

    const result = await apiFetch("/decks/1");

    expect(result).toBeUndefined();
  });
});
