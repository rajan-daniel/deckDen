import type { Config } from "./config.js";
import { z } from "zod";
import { DeckSummarySchema, DeckSchema } from "./schemas.js";

export function createClient(config: Config, fetchImpl: typeof fetch = fetch) {
  async function listMyDecks() {
    const response = await fetchImpl(`${config.apiUrl}/me/decks`, {
      headers: { Authorization: `Bearer ${config.token}` },
    });
    const body = await response.json();
    return z.array(DeckSummarySchema).parse(body);
  }

  async function getMyDeck(id: number) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new RangeError("deck id must be a positive whole number");
    }
    const response = await fetchImpl(`${config.apiUrl}/me/decks/${id}`, {
      headers: { Authorization: `Bearer ${config.token}` },
    });
    const body = await response.json();
    return DeckSchema.parse(body);
  }

  return { listMyDecks, getMyDeck };
}
