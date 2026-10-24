import { McpServer } from "@modelcontextprotocol/server";
import {
  getDeckInput,
  handleGetDeck,
  handleListMyDecks,
  listMyDecksInput,
  type DeckClient,
} from "./tools.js";

// Keep in step with "version" in package.json.
const SERVER_VERSION = "1.0.0";

// Builds the server and registers the two tools. Does not connect to anything,
// so tests can attach their own transport and a fake client.
export function createServer(client: DeckClient): McpServer {
  const server = new McpServer({ name: "deckden", version: SERVER_VERSION });

  server.registerTool(
    "list_my_decks",
    {
      title: "List my decks",
      description:
        "Lists the signed-in user's DeckDen decks: id, name, game, format, play style, description, whether it is public, and how many cards it has. Use the id with get_deck to see a deck's cards.",
      inputSchema: listMyDecksInput,
      annotations: { readOnlyHint: true },
    },
    () => handleListMyDecks(client),
  );

  server.registerTool(
    "get_deck",
    {
      title: "Get a deck",
      description:
        "Gets one of the signed-in user's decks, including every card in it (name, card id, quantity, category and notes). Get the deck_id from list_my_decks.",
      inputSchema: getDeckInput,
      annotations: { readOnlyHint: true },
    },
    (input) => handleGetDeck(client, input),
  );

  return server;
}
