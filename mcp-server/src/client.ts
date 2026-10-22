import type { Config } from "./config.js";

export function createClient(config: Config, fetchImpl: typeof fetch = fetch) {
  async function listMyDecks() {
    await fetchImpl(`${config.apiUrl}/me/decks`, {
      headers: { Authorization: `Bearer ${config.token}` },
    });
  }

  return { listMyDecks };
}
