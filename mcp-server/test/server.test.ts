import { InMemoryTransport } from "@modelcontextprotocol/server";
import type { JSONRPCMessage } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createServer } from "../src/server.js";
import type { DeckClient } from "../src/tools.js";

const { version } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version: string };

const summary = {
  id: 7,
  name: "Bleach Aggro",
  game: "Union Arena",
  format: "Standard",
  play_style: "Aggro",
  description: "Fast rush deck",
  is_public: false,
  card_count: 50,
};

const deck = {
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
};

// The parts of a reply these tests read.
type Reply = {
  result?: {
    tools?: {
      name: string;
      outputSchema?: unknown;
      annotations?: { readOnlyHint?: boolean };
      inputSchema: { required?: string[]; properties: Record<string, { type?: string }> };
    }[];
    content?: { type: string; text: string }[];
    isError?: boolean;
    serverInfo?: { version: string };
  };
};

const closers: (() => Promise<void>)[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  for (const close of closers.splice(0)) {
    await close();
  }
});

// Runs the real server (real SDK, real input checks) over an in-memory pipe and
// speaks raw JSON-RPC to it, the way a host such as Claude Desktop would.
async function startServer(client: DeckClient) {
  const server = createServer(client);
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);

  const waiting = new Map<number, (reply: Reply) => void>();
  clientSide.onmessage = (message) => {
    if ("id" in message && typeof message.id === "number") {
      waiting.get(message.id)?.(message as Reply);
    }
  };
  await clientSide.start();
  closers.push(() => server.close());

  let lastId = 0;
  function request(method: string, params: unknown): Promise<Reply> {
    const id = ++lastId;
    return new Promise((resolve) => {
      waiting.set(id, resolve);
      void clientSide.send({ jsonrpc: "2.0", id, method, params } as JSONRPCMessage);
    });
  }

  const init = await request("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "test-host", version: "0.0.0" },
  });
  await clientSide.send({ jsonrpc: "2.0", method: "notifications/initialized" });

  return {
    listTools: async () => (await request("tools/list", {})).result!.tools!,
    callTool: async (name: string, args: unknown) =>
      (await request("tools/call", { name, arguments: args })).result!,
    serverVersion: init.result!.serverInfo!.version,
  };
}

function fakeClient(overrides: Partial<DeckClient> = {}): DeckClient {
  return {
    listMyDecks: vi.fn(async () => [summary]),
    getMyDeck: vi.fn(async () => deck),
    ...overrides,
  };
}

describe("tools/list", () => {
  it("lists exactly list_my_decks and get_deck", async () => {
    const host = await startServer(fakeClient());

    const tools = await host.listTools();

    expect(tools.map((tool) => tool.name).sort()).toEqual(["get_deck", "list_my_decks"]);
  });

  it("marks both tools read-only and gives them no output schema", async () => {
    const host = await startServer(fakeClient());

    const tools = await host.listTools();

    for (const tool of tools) {
      expect(tool.annotations?.readOnlyHint).toBe(true);
      expect(tool.outputSchema).toBeUndefined();
    }
  });

  it("asks get_deck for a required whole-number deck_id and list_my_decks for nothing", async () => {
    const host = await startServer(fakeClient());

    const tools = await host.listTools();

    const getDeck = tools.find((tool) => tool.name === "get_deck")!;
    expect(getDeck.inputSchema.required).toEqual(["deck_id"]);
    expect(getDeck.inputSchema.properties.deck_id?.type).toBe("integer");
    const list = tools.find((tool) => tool.name === "list_my_decks")!;
    expect(list.inputSchema.properties).toEqual({});
  });
});

describe("tools/call", () => {
  it("list_my_decks returns the decks as JSON text", async () => {
    const client = fakeClient();
    const host = await startServer(client);

    const result = await host.callTool("list_my_decks", {});

    expect(result.isError).toBeUndefined();
    expect(result.content).toEqual([{ type: "text", text: JSON.stringify([summary]) }]);
    expect(client.listMyDecks).toHaveBeenCalledTimes(1);
  });

  it("get_deck returns the deck as JSON text and asks the client for that id", async () => {
    const client = fakeClient();
    const host = await startServer(client);

    const result = await host.callTool("get_deck", { deck_id: 7 });

    expect(result.isError).toBeUndefined();
    expect(result.content).toEqual([{ type: "text", text: JSON.stringify(deck) }]);
    expect(client.getMyDeck).toHaveBeenCalledTimes(1);
    expect(client.getMyDeck).toHaveBeenCalledWith(7);
  });
});

// What the model receives when it sends a bad deck_id. The SDK checks the input before
// our handler runs, so the client must never be called. These are the SDK's exact words.
describe("an invalid deck_id", () => {
  const PREFIX = "Input validation error: Invalid arguments for tool get_deck: deck_id: ";

  it.each([
    ["abc", "Invalid input: expected number, received string"],
    [-4, "Too small: expected number to be >0"],
    [3.5, "Invalid input: expected int, received number"],
    [0, "Too small: expected number to be >0"],
    [null, "Invalid input: expected number, received null"],
  ])("%j is rejected as an error result, before any API call", async (deck_id, reason) => {
    const client = fakeClient();
    const host = await startServer(client);

    const result = await host.callTool("get_deck", { deck_id });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([{ type: "text", text: PREFIX + reason }]);
    expect(client.getMyDeck).not.toHaveBeenCalled();
    expect(client.listMyDecks).not.toHaveBeenCalled();
  });

  it("a missing deck_id is rejected as an error result, before any API call", async () => {
    const client = fakeClient();
    const host = await startServer(client);

    const result = await host.callTool("get_deck", {});

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      { type: "text", text: PREFIX + "Invalid input: expected number, received undefined" },
    ]);
    expect(client.getMyDeck).not.toHaveBeenCalled();
  });

  it("does not repeat the rejected value back to the model", async () => {
    const client = fakeClient();
    const host = await startServer(client);

    const result = await host.callTool("get_deck", { deck_id: "dd_pat_pretend-secret" });

    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).not.toContain("dd_pat_");
    expect(client.getMyDeck).not.toHaveBeenCalled();
  });
});

describe("failures inside a tool", () => {
  it("an unexpected error reaches the model as the generic message, not the raw one", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const client = fakeClient({
      getMyDeck: vi.fn().mockRejectedValue(new Error("boom, Bearer dd_pat_secret-123")),
    });
    const host = await startServer(client);

    const result = await host.callTool("get_deck", { deck_id: 7 });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      {
        type: "text",
        text: "Something went wrong while reading from DeckDen. Try again shortly.",
      },
    ]);
  });

  it("the server still answers the next call after a failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const client = fakeClient({
      getMyDeck: vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValue(deck),
    });
    const host = await startServer(client);

    const first = await host.callTool("get_deck", { deck_id: 7 });
    const second = await host.callTool("get_deck", { deck_id: 7 });

    expect(first.isError).toBe(true);
    expect(second.isError).toBeUndefined();
    expect(second.content).toEqual([{ type: "text", text: JSON.stringify(deck) }]);
  });
});

describe("initialize", () => {
  it("server version matches in package.json", async () => {
    const host = await startServer(fakeClient());

    expect(host.serverVersion).toBe(version);
  });
});