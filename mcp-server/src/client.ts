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

export function createClient(config: Config, fetchImpl: typeof fetch = fetch) {
  // Sends an authenticated GET. Handles the errors every endpoint shares.
  async function request(path: string): Promise<Response> {
    const response = await fetchImpl(`${config.apiUrl}${path}`, {
      headers: { Authorization: `Bearer ${config.token}` },
    });

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

  async function listMyDecks() {
    const response = await request("/me/decks");

    const body = await response.json();
    return z.array(DeckSummarySchema).parse(body);
  }

  async function getMyDeck(id: number) {
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new RangeError("deck id must be a positive whole number");
    }
    const response = await request(`/me/decks/${id}`);

    if (response.status === 404) {
      throw new ApiError("not_found", "Deck not found.");
    }
    const body = await response.json();
    return DeckSchema.parse(body);
  }

  return { listMyDecks, getMyDeck };
}
