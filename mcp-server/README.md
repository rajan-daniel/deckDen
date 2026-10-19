# DeckDen MCP Server

A local [MCP](https://modelcontextprotocol.io) server that will let a user's AI assistant (like Claude Desktop) read their DeckDen decks. It connects with a personal access token created on the account page, under "AI assistants". The token is read-only.

**Status: scaffold only.** The project builds and typechecks, but there are no tools yet.

## What's done so far

- Created the `mcp-server/` folder at the repo root, next to `backend/` and `frontend/`, with its own `package.json`, `tsconfig.json`, `.nvmrc` and `.gitignore`.
- TypeScript in strict mode, compiled to ESM for Node (`NodeNext`), output in `dist/`.
- Node 24 (see `.nvmrc`).
- Installed the v2 MCP SDK (`@modelcontextprotocol/server` 2.3.1) and `zod` 4.6.7 at exact versions. zod describes and validates the arguments an assistant sends to a tool.
- `@types/node` is pinned to 24 to match the Node version.
- `.gitignore` covers `node_modules/`, `dist/`, `coverage/` and `.env` files, so a token can't be committed by accident.

## Setup

Use the Node version in `.nvmrc`, then from this folder:

```bash
npm install
npm run build
npm run typecheck
```

`npm start` runs the built server (`dist/index.js`). It doesn't do anything yet.

## Planned

- **Tools (v1):** `list_my_decks` and `get_deck`. They call `GET /me/decks` and `GET /me/decks/{deck_id}`, which an access token is allowed to reach. The server only passes on the fields the assistant needs: no email, no image URLs, no owner info.
- **Card tools** ("how does this card work?", "how do I play this deck?") need card effect text, which DeckDen doesn't store yet. That's a separate backend ticket (import card text and add a lookup endpoint).
- **Configuration:** two environment variables, `DECKDEN_API_URL` and `DECKDEN_TOKEN`. The server will exit with a clear message if either is missing, and it will refuse a plain `http://` URL unless the host is localhost. Never commit a token. If one leaks, disconnect it on the account page and make a new one.

## Notes for development

- The server will talk to the assistant over stdio, so **nothing may write to stdout** except the protocol. Use `console.error` for debug output.
- Imports of our own files need the `.js` extension (for example `./client.js`), even though the source is `.ts`.
- Build the server and register tools with `registerTool` inside the function passed to `serveStdio`. Give each tool an `inputSchema` written with zod, and keep it as strict as the real data (for example, a deck id is a whole number above 0).
