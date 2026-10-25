import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

// The compiled server, run the way a host such as Claude Desktop runs it.
const ENTRY = fileURLToPath(new URL("../dist/index.js", import.meta.url));

// Made-up values. The token is not real, and nothing here reaches the network.
const FAKE_TOKEN = "dd_pat_smoke-test-not-a-real-token";
const FAKE_ENV = { DECKDEN_API_URL: "http://localhost:9", DECKDEN_TOKEN: FAKE_TOKEN };

type Message = { jsonrpc?: string; id?: number; result?: { tools?: { name: string }[] } };

const running: { kill: () => boolean }[] = [];

afterEach(() => {
  for (const child of running.splice(0)) {
    child.kill();
  }
});

// Starts the built server as a separate process and talks JSON-RPC to it over stdio.
function startBuiltServer(env: Record<string, string>) {
  // Fails every test with this message. A missing build must never be skipped quietly.
  if (!existsSync(ENTRY)) {
    throw new Error(
      `The built server is missing (${ENTRY}). Run "npm run build" first. "npm test" does this for you.`,
    );
  }

  // The env is the parent's with our made-up values on top, so a real token
  // in the developer's shell can never reach this process.
  const child = spawn(process.execPath, [ENTRY], {
    env: { ...process.env, ...env },
    windowsHide: true,
  });
  running.push(child);

  let stdoutText = "";
  let stderrText = "";
  const messages: Message[] = [];
  const notJson: string[] = [];
  const waiting = new Map<number, (message: Message) => void>();

  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    stdoutText += chunk;
    // Messages are one JSON object per line.
    const lines = stdoutText.split("\n");
    stdoutText = lines.pop()!;
    for (const line of lines) {
      if (line.trim() === "") continue;
      try {
        const message = JSON.parse(line) as Message;
        messages.push(message);
        if (message.id !== undefined) waiting.get(message.id)?.(message);
      } catch {
        notJson.push(line);
      }
    }
  });
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    stderrText += chunk;
  });

  const exited = new Promise<number | null>((resolve) => {
    child.on("close", (code) => resolve(code));
  });

  let lastId = 0;
  return {
    child,
    messages,
    notJson,
    exited,
    stdout: () => stdoutText,
    stderr: () => stderrText,
    request(method: string, params: unknown): Promise<Message> {
      const id = ++lastId;
      return new Promise((resolve) => {
        waiting.set(id, resolve);
        child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
      });
    },
    notify(method: string) {
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method }) + "\n");
    },
  };
}

async function handshake(server: ReturnType<typeof startBuiltServer>) {
  await server.request("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "smoke-test", version: "0.0.0" },
  });
  server.notify("notifications/initialized");
}

describe("the built server", () => {
  it("lists exactly the two tools", async () => {
    const server = startBuiltServer(FAKE_ENV);
    await handshake(server);

    const reply = await server.request("tools/list", {});

    const names = reply.result!.tools!.map((tool) => tool.name).sort();
    expect(names).toEqual(["get_deck", "list_my_decks"]);
  }, 15_000);

  it("writes nothing but protocol messages to stdout, and never the token to stderr", async () => {
    const server = startBuiltServer(FAKE_ENV);
    await handshake(server);
    await server.request("tools/list", {});
    // A bad id is rejected before any API call, so this needs no network either.
    await server.request("tools/call", { name: "get_deck", arguments: { deck_id: "abc" } });

    expect(server.notJson).toEqual([]);
    expect(server.messages.length).toBeGreaterThanOrEqual(3);
    for (const message of server.messages) {
      expect(message.jsonrpc).toBe("2.0");
    }
    expect(JSON.stringify(server.messages)).not.toContain(FAKE_TOKEN);
    expect(server.stderr()).not.toContain(FAKE_TOKEN);
  }, 15_000);

  it("exits cleanly when the host closes its end of the pipe", async () => {
    const server = startBuiltServer(FAKE_ENV);
    await handshake(server);

    server.child.stdin.end();

    expect(await server.exited).toBe(0);
  }, 15_000);
});

describe("the built server with bad configuration", () => {
  it("says what is missing on stderr, writes nothing to stdout, and exits with code 1", async () => {
    const server = startBuiltServer({ ...FAKE_ENV, DECKDEN_TOKEN: "" });

    const code = await server.exited;

    expect(code).toBe(1);
    expect(server.stderr()).toContain("DeckDen MCP server can't start.");
    expect(server.stderr()).toContain("DECKDEN_TOKEN is not set.");
    expect(server.messages).toEqual([]);
    expect(server.notJson).toEqual([]);
  }, 15_000);

  it("does not repeat a malformed token back", async () => {
    const server = startBuiltServer({ ...FAKE_ENV, DECKDEN_TOKEN: "secret-without-the-prefix" });

    const code = await server.exited;

    expect(code).toBe(1);
    expect(server.stderr()).toContain("DECKDEN_TOKEN is not in the expected format");
    expect(server.stderr()).not.toContain("secret-without-the-prefix");
  }, 15_000);
});
