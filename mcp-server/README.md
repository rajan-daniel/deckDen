# DeckDen MCP Server

A local [MCP](https://modelcontextprotocol.io) server that lets your AI assistant (like Claude Desktop) read your DeckDen decks. It runs on your computer and talks to the assistant over stdio. It connects to DeckDen with a personal access token that you create on your account page. The token is read-only, so the assistant can look at your decks but can't change anything.

## Tools

There are two tools. Neither takes anything but the arguments listed here.

| Tool | Arguments | What it returns |
| --- | --- | --- |
| `list_my_decks` | none | Your decks, as a JSON array. |
| `get_deck` | `deck_id`: a whole number above 0, from `list_my_decks` | One deck with all its cards, as a JSON object. |

Both return compact JSON as plain text. Each deck in the list has:

```json
{"id":7,"name":"Bleach Aggro","game":"Union Arena","format":"Standard","play_style":"Aggro","description":"Fast rush deck","is_public":false,"card_count":50}
```

`get_deck` returns the same fields except `card_count`, plus a `cards` array:

```json
{"card_name":"Uryu Ishida","external_card_id":"UE01ST/BLC-1-034","quantity":4,"category":"Character","notes":"Main attacker"}
```

Fields that you left empty on a deck (`format`, `play_style`, `description`, and a card's `external_card_id`, `category` and `notes`) come back as `null`.

The assistant never sees your email, owner info, or image URLs. The server drops everything that isn't listed above, even if the DeckDen API sends it.

### When something goes wrong

The assistant gets a short error message it can pass on to you. It never contains your token or anything from DeckDen's raw reply.

- **DeckDen didn't accept the token** (it was disconnected, or has expired). Create a new one on your account page.
- **Deck not found.** The id doesn't exist, or it isn't yours.
- **Couldn't reach DeckDen**, or DeckDen is slow or having trouble. Try again shortly.
- **A bad `deck_id`** (for example `"abc"`, `-4` or `3.5`) is rejected before anything is sent to DeckDen.
- **Anything unexpected** becomes a generic "something went wrong" message. The details go to the server's log (stderr), with anything that looks like a token removed.

## Setup

You need Node 24 (see `.nvmrc`). From this folder:

```bash
npm install
npm run build
```

The server runs from the build in `dist/`, which isn't committed, so build it once after cloning and again after any change.

## Configuration

The server is configured with two environment variables. It exits with a clear message if either is missing or malformed.

| Variable | What it is |
| --- | --- |
| `DECKDEN_API_URL` | Where the DeckDen API lives, for example `http://localhost:8000` for a local backend. It must start with `https://`, except that plain `http://` is accepted for localhost. |
| `DECKDEN_TOKEN` | Your access token. It starts with `dd_pat_`. |

[`.env.example`](.env.example) lists both. It is documentation only: the server reads the real environment and never loads that file itself.

### Create a token

1. Sign in to DeckDen and open your account page.
2. Under **AI assistants**, give the assistant a name and click **Connect an assistant**.
3. Copy the token. It is shown once, so copy it before you click **Done**.

If a token leaks, or you're done with it, click **Disconnect** next to it on the same page and make a new one if you need to. Never commit a token or paste it into a chat.

### Run it by hand

To start the server yourself, copy `.env.example` to `.env` (it is git-ignored), fill in both values, then:

```bash
node --env-file=.env dist/index.js
```

Node reads the file itself, so no extra package is needed. If a variable is already set in your shell, the shell's value wins. The server then waits for an assistant on stdin. You won't see any output, because stdout is reserved for the protocol. Press Ctrl+C to stop it.

## Connect Claude Desktop

Add the server to Claude Desktop's config file, then restart Claude Desktop. In Claude Desktop, open **Settings**, then **Developer**, then **Edit Config**. That opens the file:

- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "deckden": {
      "command": "node",
      "args": ["/full/path/to/deckDen/mcp-server/dist/index.js"],
      "env": {
        "DECKDEN_API_URL": "https://your-deckden-api.example.com",
        "DECKDEN_TOKEN": "paste-your-token-here"
      }
    }
  }
}
```

- Use the full path to `dist/index.js` on your computer. On Windows, write backslashes twice (`C:\\Users\\you\\...`) or use forward slashes.
- Replace `paste-your-token-here` with your own token. The placeholder is deliberately not a valid token, so forgetting to replace it fails with a clear message.
- If Claude Desktop can't find `node`, put the full path to the `node` program in `command`.
- The token is stored in this file as plain text. Keep the file private, and never share or commit it.

Then ask Claude something like "which decks do I have in DeckDen?"

## Try it in the MCP Inspector

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) is a web page for calling a server's tools by hand. With the server built and your `.env` filled in (a throwaway token is best), run this from this folder:

```bash
npx @modelcontextprotocol/inspector@2.12.0 node --env-file=.env dist/index.js
```

`npx` downloads the Inspector the first time. Open the page it prints, click **Connect**, open the **Tools** tab and click **List Tools**. You should see exactly `list_my_decks` and `get_deck`. Select one to try it.

When you're done, disconnect the Inspector and click **Disconnect** on that token on your account page. Don't type the token on the command line, where it would end up in your shell history.

## Development

```bash
npm run typecheck   # types only
npm run build       # compile src/ to dist/
npm test            # build, then run the tests
```

`npm test` builds first (through `pretest`), because one of the tests starts the built server (`dist/index.js`) as a real process and checks that it lists exactly the two tools. If the build is missing, that test fails with a message saying so instead of being skipped.

The code is small:

- `src/config.ts` reads and checks the two environment variables.
- `src/schemas.ts` lists the fields the assistant is allowed to see. Everything else is dropped.
- `src/client.ts` calls the DeckDen API and turns every failure into an `ApiError` with a fixed, safe message.
- `src/tools.ts` holds the tool inputs and handlers. A handler is given the client, so tests can pass a fake one and need no network or token.
- `src/server.ts` registers the two tools. `src/index.ts` only reads the config, builds the client and starts serving.

Rules to keep:

- **Nothing may write to stdout** except the protocol, because the assistant reads stdout as protocol messages. A stray `console.log` breaks the connection. Use `console.error`, which goes to stderr.
- **Never log or return a whole error object.** It can carry request details, and the token is in those. Log only the error's name and message, as `src/tools.ts` does.
- **A failure inside a tool must become an error result, never a crash.** The SDK sends the message of anything a handler throws straight to the assistant, so a handler catches its own errors.
- Imports of our own files need the `.js` extension (for example `./client.js`), even though the source is `.ts`.
- Give each tool an `inputSchema` written with zod, and keep it as strict as the real data (a deck id is a whole number above 0).
- Use made-up tokens in tests, never a real `dd_pat_` token.

## Not included yet

- **Card tools** ("how does this card work?") need card effect text, which DeckDen doesn't store yet. That's a separate backend ticket.
- **Changing decks.** Tokens are read-only, and the backend enforces that. Writing needs tokens that can write first.
- **Resources and prompts.** MCP has two other features besides tools: resources (data the assistant can read) and prompts (ready-made prompt templates). This server only offers tools, so it doesn't advertise either.
- **HTTP transport and publishing to npm.** The server runs locally over stdio from a local build.
- **Pagination, caching and rate limiting.** Deck lists are short today, a cached copy could be stale, and the backend has no rate limit yet, so a looping assistant could send it a lot of requests.
