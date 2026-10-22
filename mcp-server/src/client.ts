import type { Config } from "./config.js";
import { z } from "zod";
import { DeckSummarySchema } from "./schemas.js";

export function createClient(config: Config, fetchImpl: typeof fetch = fetch) {
  async function listMyDecks() {
    const response = await fetchImpl(`${config.apiUrl}/me/decks`, {
      headers: { Authorization: `Bearer ${config.token}` },
    });
    const body = await response.json();
    return z.array(DeckSummarySchema).parse(body);
  }

  return { listMyDecks };
}
