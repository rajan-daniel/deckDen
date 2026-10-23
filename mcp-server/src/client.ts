import type { Config } from "./config.js";
import { z } from "zod";
import { DeckSummarySchema, DeckSchema } from "./schemas.js";

export type ApiErrorKind =
  | "unauthorized"
  | "not_found"
  | "server"
  | "network"
  | "timeout"
  | "bad_response";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;

  constructor(kind: ApiErrorKind, message: string) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
  }
}

const REQUEST_TIMEOUT_MS = 10_000;

const UNREADABLE_MESSAGE =
  "DeckDen sent a reply this server couldn't read. If it keeps happening, update the DeckDen MCP server.";

export function createClient(config: Config, fetchImpl: typeof fetch = fetch) {
  // Turns whatever fetch (or reading a body) threw into an ApiError.
  function toApiError(error: unknown): ApiError {
    const origin = new URL(config.apiUrl).origin;
    if (error instanceof Error && error.name === "TimeoutError") {
      return new ApiError(
        "timeout",
        `DeckDen at ${origin} took too long to answer. Try again shortly.`,
      );
    }
    return new ApiError("network", `Couldn't reach DeckDen at ${origin}.`);
  }

  // Sends an authenticated GET. Handles the errors every endpoint shares.
  async function request(path: string): Promise<Response> {
    let response: Response;
    try {
      response = await fetchImpl(`${config.apiUrl}${path}`, {
        headers: { Authorization: `Bearer ${config.token}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw toApiError(error);
    }

    if (response.status === 401) {
      throw new ApiError(
        "unauthorized",
        "DeckDen didn't accept the token. Create a new one on your account page.",
      );
    }

    if (response.status >= 500) {
      throw new ApiError(
        "server",
        "DeckDen is having trouble. Try again shortly.",
      );
    }

    return response;
  }

  // Reads the body and checks its shape. Anything unreadable becomes an ApiError.
  async function readBody<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
    let body: unknown;
    try {
      body = await response.json();
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ApiError("bad_response", UNREADABLE_MESSAGE);
      }
      throw toApiError(error);
    }

    const result = schema.safeParse(body);
    if (!result.success) {
      throw new ApiError("bad_response", UNREADABLE_MESSAGE);
    }
    return result.data;
  }

  async function listMyDecks() {
    const response = await request("/me/decks");
    return readBody(response, z.array(DeckSummarySchema));
  }

  async function getMyDeck(id: number) {
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new RangeError("deck id must be a positive whole number");
    }
    const response = await request(`/me/decks/${id}`);

    if (response.status === 404) {
      throw new ApiError("not_found", "Deck not found.");
    }
    return readBody(response, DeckSchema);
  }

  return { listMyDecks, getMyDeck };
}
