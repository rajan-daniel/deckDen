import type { CallToolResult } from "@modelcontextprotocol/server";
import { z } from "zod";
import { ApiError, type createClient } from "./client.js";

// The part of the API client the tools use. Tests pass a fake that matches this.
export type DeckClient = Pick<
  ReturnType<typeof createClient>,
  "listMyDecks" | "getMyDeck"
>;

export const listMyDecksInput = z.object({});

export const getDeckInput = z.object({
  deck_id: z
    .int()
    .positive()
    .describe("The deck's id, as returned by list_my_decks."),
});

export type GetDeckInput = z.infer<typeof getDeckInput>;

// What the model sees when something we didn't plan for fails.
const UNEXPECTED_MESSAGE =
  "Something went wrong while reading from DeckDen. Try again shortly.";

// Anything shaped like an access token. Cuts it out of text we log.
const TOKEN_LIKE = /dd_pat_[A-Za-z0-9_-]+/g;

function successResult(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
}

function errorResult(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

// Logs only the error's name and message, to stderr (stdout is the protocol channel).
// Never logs the whole error: it can carry request details, and the token is in those.
function logUnexpected(error: unknown): void {
  const text =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : "a value that is not an Error was thrown";
  console.error(`Unexpected error in a tool: ${text.replace(TOKEN_LIKE, "[redacted]")}`);
}

// Runs a tool's work. A failure becomes an error result, never a dead process.
async function toResult(work: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    return successResult(await work());
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResult(error.message);
    }
    logUnexpected(error);
    return errorResult(UNEXPECTED_MESSAGE);
  }
}

export function handleListMyDecks(client: DeckClient): Promise<CallToolResult> {
  return toResult(() => client.listMyDecks());
}

export function handleGetDeck(
  client: DeckClient,
  input: GetDeckInput,
): Promise<CallToolResult> {
  return toResult(() => client.getMyDeck(input.deck_id));
}
