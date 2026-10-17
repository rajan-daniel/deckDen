# DeckDen MCP Server

A local [MCP](https://modelcontextprotocol.io) server that will let a user's AI assistant (like Claude Desktop) read their DeckDen decks. It connects with a personal access token created on the account page, under "AI assistants". The token is read-only.

**Status: scaffold only.** The project builds and typechecks, but there are no tools yet.

## What's done so far

- Created the `mcp-server/` folder at the repo root, next to `backend/` and `frontend/`, with its own `package.json`, `tsconfig.json`, `.nvmrc` and `.gitignore`.
- TypeScript in strict mode, compiled to ESM for Node (`NodeNext`), output in `dist/`.
- Node 24 (see `.nvmrc`).
- Installed the MCP SDK (`@modelcontextprotocol/sdk` 1.32.1) and `zod` 4.6.7 at exact versions. zod will validate the arguments an assistant sends to a tool.
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

- **v1 tools** (final list still being decided): get my profile, list my decks, get one deck. These only use the endpoints an access token is allowed to reach: `GET /me`, `GET /me/decks` and `GET /me/decks/{deck_id}`.
- **Card tools** ("how does this card work?", "how do I play this deck?") need card effect text, which DeckDen doesn't store yet. That's a separate backend ticket (import card text and add a lookup endpoint).
- **Configuration:** the API URL and the access token will come from environment variables (names to be decided). Never commit a token. If one leaks, disconnect it on the account page and make a new one.

## Notes for development

- The server will talk to the assistant over stdio, so **nothing may write to stdout** except the protocol. Use `console.error` for debug output.
- Imports of our own files need the `.js` extension (for example `./client.js`), even though the source is `.ts`.
- Register tools with `registerTool`. The older `server.tool()` is deprecated in this SDK version.
