# 🃏 DeckDen

DeckDen is a deck-tracking app built for trading card game players who don't just play one game. Every TCG has its own official app or community tool for tracking decks — one for Yu-Gi-Oh!, another for Pokémon, another for whatever else you're into — but none of them are built around the *player*. They're built around the game. DeckDen flips that: one account, one public profile, and every deck you've built across every game you play, all in one clean, fast place, instead of juggling a different siloed app per game.

---

## ✨ Technologies

* TypeScript
* Next.js
* React
* Tailwind CSS
* Python
* FastAPI
* PostgreSQL
* SQLAlchemy
* Docker
* Resend (transactional email)
* WebAuthn / passkeys (py_webauthn, @simplewebauthn/browser)
* Model Context Protocol (MCP) SDK, zod
* Render
* Vercel
* pytest
* Vitest + React Testing Library

---

## 🚀 Features

* 🎴 Build and save decklists across Yu-Gi-Oh! and Union Arena (Pokémon is temporarily paused while card lookups are too slow on the free-tier backend — existing decks are untouched, and it's a one-line switch in `frontend/lib/games.ts` to bring it back)
* 🔍 Live card search pulled straight from each game's real card database
* 🌐 Public profiles that show everything a player builds across every game, not just one
* 🔒 Public or private visibility, set per deck
* 🏷️ Optional play style tags (Competitive, Meta, Casual, Fun, Beginner, Advanced, Budget, Test)
* 🔐 Secure authentication — hashed passwords, JWT sessions
* ✉️ Self-service password reset via email
* 🔑 Passkeys (WebAuthn) — sign in with your device's fingerprint, face, or PIN alongside password login, and add or remove passkeys from your account page
* 🤖 AI assistant access tokens — create a read-only token on your account page to let an AI assistant read your decks, and disconnect it any time
* 🗑️ Self-service account deletion, with data actually cleaned up behind it
* 🔎 Click-to-zoom card focus view, sized consistently across games
* 📱 Fully responsive, consistent dark-themed design system
* 📄 Real legal pages — About, Contact, Privacy Policy, Terms of Service

---

## 📍 The Process

DeckDen started as a way to solve a problem I kept running into as a multi-game player myself, and grew from a basic deck CRUD app into a full account system with password recovery, self-service account deletion, and a proper design system — and gained passkey sign-in, built as an addition to password login rather than a replacement. The latest work is letting AI assistants read a player's decks: read-only access tokens, and an MCP server being built on top of them.

Rather than summarizing the process after the fact, the timeline below walks through how it actually came together — kept as short, in-the-moment notes rather than a polished retrospective, so the real decisions, bugs, and milestones stay visible instead of getting smoothed over.

---

## 🛠️ Development Timeline

### 📅 7/27/2026

* Scaffolded the Next.js frontend and FastAPI backend, with the core data model (users, decks, cards) and JWT auth wired end to end.
* Full deck loop working: create, add/remove cards, edit, delete, browse publicly.
* Fixed a hook-ordering bug on the deck detail page.

---

### 📅 7/28/2026

* Live card search wired up — Yu-Gi-Oh! via YGOPRODeck, Pokémon via the official Pokémon TCG API.
* Added player lookup by username from the nav.
* Full visual pass to the current dark theme and component system.
* Started Union Arena support — no public API exists, so this means a card database of my own.

---

### 📅 8/17/2026

* Redesigned deck browsing into poster-style cards, sizing normalized across games, reused across My Decks and public profiles.
* Added click-to-zoom on individual cards; fixed Yu-Gi-Oh! art getting clipped by the modal's own border radius.
* Fixed a real race condition on the deck detail page — a stale unauthenticated request could overwrite a later successful one and show owners a false "Deck not found." Fixed with a request-generation guard.
* Built out the footer, About, Contact, Privacy Policy, and Terms of Service pages.
* Added password reset (single-use, 30-minute SHA-256 tokens via Resend, console-log fallback with no API key) and self-service account deletion with cascading cleanup.
* Moved the CORS origin to an environment variable instead of a hardcoded `localhost:3000`.
* Ran a full secrets audit — confirmed no `.env` or key has ever touched git history.

---

### 📅 8/19/2026

* Built a Union Arena scraper — reads the set list live instead of a hardcoded list, upserts by card code so it's always safe to re-run. Ran it for real: 46 sets, 6,343 cards.
* `SECRET_KEY` now fails loudly on boot if it's missing, instead of silently falling back to a default.
* Fixed Union Arena search to also match card code, order results deterministically, and raised the result cap from 8 to 50.
* Added an optional play style tag to decks (Competitive, Meta, Casual, Fun, Beginner, Advanced, Budget, Test).
* Added a "Done editing" button on the deck page for a sense of closure — saves were already instant.

---

### 📅 8/20/2026

* Replaced the icon with a proper gradient logo mark across the navbar, footer, and favicon.

---

### 📅 8/21/2026

* First real deploy: Railway for the backend and Postgres, Vercel for the frontend. Moved `--reload` out of the production Dockerfile into a docker-compose dev override.
* Re-ran the Union Arena import against the (empty) production database.
* Smoke-tested the live site and caught two real misconfigurations: a `CORS_ORIGINS` mismatch and a leftover placeholder backend URL.
* Verified a custom sending domain with Resend so reset emails no longer come from the shared sandbox address.
* Fixed Pokémon search to match mid-string instead of prefix-only, and to surface upstream failures as real errors instead of silently looking like "no results" — the free Pokémon TCG API is being sunset and is genuinely unreliable.

---

### 📅 8/24/2026

* Added test coverage: a 48-test pytest suite (backend) and a 23-test Vitest suite (frontend). Backend tests run against real SQLite, not mocks.
* First run caught a real bug: password-reset expiry checks only ever worked in prod by accident (Postgres returns tz-aware datetimes, SQLite doesn't). Fixed with a `TZDateTime` type.
* Proxied Pokémon search through the backend instead of calling the upstream API directly from the browser — a real server-side API key means a much higher rate limit, and the proxy now handles upstream timeouts/failures cleanly instead of crashing.

---

### 📅 9/2/2026

* Added CI: GitHub Actions runs the pytest and Vitest suites on every push and pull request, required to pass before merging to `main`.
* Backend and frontend versions pinned via `.python-version` / `.nvmrc` so local tooling and CI read from one source of truth.

---

### 📅 9/3/2026

* Added `lint` and `typecheck` as required CI checks alongside the test suites.
* Tuned the eslint ruleset instead of enforcing it blindly — turned off a legacy rule, downgraded two newer, more opinionated hook rules to warnings pending a dedicated cleanup pass, and fixed the small number of genuinely real issues along the way.
* Bumped `@types/node` to match the Node 24 runtime Vercel actually builds on.

---

### 📅 9/21/2026

* Railway's free credits ran out and took the backend down. Migrated the backend and Postgres to Render rather than paying to keep Railway alive.
* Rebuilt clean instead of restoring — the database only held test data, so it wasn't worth preserving. Re-ran the Union Arena import (safe to re-run) against the new database instead.
* Fixed the Dockerfile to read the port Render assigns dynamically via `$PORT` instead of a hardcoded `8000`.
* Updated `CORS_ORIGINS` and the frontend's `NEXT_PUBLIC_API_URL` to point at the new backend, verified the live site end to end, then decommissioned Railway.
* Started passkey (WebAuthn) support, schema first: a credentials table and a separate short-lived challenges table, kept apart on purpose because one is durable account data and the other is ~60 seconds of throwaway state. Strictly additive — password login is untouched.

---

### 📅 9/22/2026

* Added passkey registration: `POST /webauthn/register/options` and `/verify`, using `py_webauthn`.
* A challenge is invalidated *before* verification is attempted, so it's single-use whether the attempt succeeds or fails.
* The first draft had several bugs I only found by actually running it instead of reading it — missing imports, a malformed `rp_id`, and a challenge that only invalidated on success. Tested the failure paths against the real API and the real database, not just the happy path.
* Registered a real passkey through a real browser and confirmed the credential row landed in Postgres.

---

### 📅 10/8/2026

* Added passkey login: `POST /webauthn/login/options` and `/verify`. Neither needs a session (they're how you get one) and both end by issuing the same JWT as password login, so the rest of the app can't tell which path a user came in through.
* Every failure path returns the same `401 "Invalid email or password"` — unknown account, no passkeys, expired challenge, failed verification — so responses never reveal whether an account or passkey exists.
* An end-to-end browser test caught a real bug the unit-level checks couldn't: the options endpoints asked for user verification as merely "preferred" while the verify endpoints required it, so valid authenticators were being rejected. Both sides now agree.
* That failure was nearly invisible because the verify endpoints swallowed the underlying exception. They now log the real reason server-side while still returning a generic message to the client.

---

### 📅 10/9/2026

* Added passkey management to the account page: list your passkeys, add one, remove one. Backed by `GET` and `DELETE /webauthn/credentials`.
* The list endpoint returns an allow-list of fields only (never the public key or credential id), and delete is scoped to the owner — another user's passkey gets the same `404` as one that doesn't exist, so ids can't be probed.

---

### 📅 10/13/2026

* Added "Sign in with a passkey" to the login page, alongside the password form rather than replacing it.
* Extracted a single `loginWithToken` session path in the auth context so password and passkey sign-in end in the same place. The existing password-login tests passed unchanged before I added anything new, which is how I knew the refactor didn't change behavior.
* Kept the passkey ceremony in a small `lib/passkeys.ts` helper (same pattern as `card-apis.ts`) instead of in the page or the auth provider, so it can be unit-tested without a browser and the provider doesn't have to import a browser-only API.
* The ticket asked for a "clear error" when an account has no passkey, but that conflicts with a decision made earlier in the backend: unknown account, no passkeys, and failed verification all return the same `401`, so responses never reveal whether an account exists. I kept the security behavior, wrote the UI message to match ("We couldn't sign you in with a passkey…"), and corrected the ticket instead of weakening the code.

---

### 📅 10/14/2026

* Added automated tests for the whole passkey flow: 35 backend tests (pytest) and 10 frontend tests (Vitest). Together with the existing suites, CI now runs 89 backend and 48 frontend tests on every pull request.
* The only thing faked is the library's own verify call, because a real attestation can only come from a browser's authenticator. Everything of mine around it runs for real: the challenge lifecycle, ownership checks, the identical-401 behavior, encoding, sign-count updates, and the session that comes back. The cryptography itself is covered by real-browser runs instead.
* A passing test proves little, so I checked the tests by breaking the code on purpose: 21 deliberate bugs in throwaway copies, each one caught. They included re-introducing a hardcoded relying-party id and the account-existence leak. The same check also exposed one of my early tests that passed without actually asserting anything.

---

### 📅 10/15/2026

* Paused Pokémon: card lookups were too slow on the free-tier backend, so it's hidden from navigation and the deck picker behind a one-line flag in `lib/games.ts`. Existing Pokémon decks keep their colors and logos, and bringing it back is flipping `enabled`.
* Added personal access tokens to the backend so an AI assistant can read a player's decks. They're read-only on purpose: a token works only on `GET /me`, `GET /me/decks` and `GET /me/decks/{id}`, and everything else still requires a login session.
* A token is `dd_pat_` plus a random part, shown once, and only its SHA-256 hash is stored, the same approach as the password reset tokens. It expires after 90 days without use (capped at one year from creation), and a password reset disconnects every token.
* Added the account page side: connect an assistant, see your tokens, disconnect one. A new token is shown once with a Copy button and lives only in component state.
* CI now runs 111 backend and 68 frontend tests on every pull request.

---

### 📅 10/19/2026

* Started the MCP server in `mcp-server/`, so an AI assistant like Claude Desktop can read a user's decks with one of those tokens. Learned the protocol and the MCP Inspector on a throwaway hello-world server before building the real one.
* Settled the scope before writing code: v1 is two tools, `list_my_decks` and `get_deck`, and only passes on the fields an assistant needs. No email, no image URLs, no owner info. Card questions ("how does this card work?") wait on card effect text, which DeckDen doesn't store yet.
* Scaffolded it as strict TypeScript (ESM, Node 24 via `.nvmrc`) with the v2 MCP SDK and zod at exact versions, and gave it its own `mcp-server` job in CI (typecheck and build).

---

### 📅 10/20/2026

* Wrote the config reader test-first. It needs `DECKDEN_API_URL` and `DECKDEN_TOKEN`, fails loudly with a clear message if either is missing, and refuses a plain `http://` URL unless the host is localhost. A token with a trailing newline, quotes, or `Bearer ` in front is rejected rather than quietly cleaned up, because a silent fix would hide a setup mistake.
* Added a test that no config error message ever contains the token. It checks the whole token and every 6-character piece of its random part, so a partial leak is caught too, and it has a positive control so the detector can't pass by being blind.
* Added the response schema for the deck list: zod keeps only the fields the assistant needs and drops everything else the backend sends. My first draft required `format`, `play_style` and `description` to be strings, but the backend sends `null` when they're unset. A failing test showed it before the fix.
* Checked these tests the same way as the passkey work, by breaking the code on purpose and confirming the right test goes red each time.
* The `mcp-server` CI job now runs its tests too (40 so far).

---

### 📅 10/21/2026

* Finished the response schemas with the full deck and its cards. The deck and the deck list share one set of common fields instead of each repeating them, so a field that both responses gain is added in one place. The card fields the backend can leave empty (`external_card_id`, `category`, `notes`) accept `null`, and the schema drops the ids and image URL the assistant doesn't need.
* Kept `game` as a plain string on purpose. Pokémon decks still exist and still come back from the API even though the site hides Pokémon, and when a game is added to the backend, every copy of the server already installed on someone's machine shouldn't start failing for people who own a deck in it.
* Started the API client. It takes the config and a `fetch` it can be handed, so the tests never touch the network. `listMyDecks()` and `getMyDeck(id)` send the token only in the `Authorization` header, and every response goes through the schemas, so only the allow-listed fields come out. `getMyDeck` rejects a bad id before sending anything.
* The tests caught two of my own mistakes. My first `getMyDeck` parsed the response as a list, but that endpoint returns one deck. And a leftover `return` made the types fail while every test stayed green, which is why CI runs the typecheck as its own step.
* Broke the code on purpose again: all five deck schema bugs were caught by the test I predicted. One of my own bugs landed on the wrong line and crashed the whole file, which showed me that a crash isn't evidence a test works.
* The `mcp-server` suite is at 53 tests.

---

### 📅 10/22/2026

* Finished the API client's error handling, test-first. Every failure now comes out as one `ApiError` with a kind (`unauthorized`, `not_found`, `server`, `network`, `timeout`, `bad_response`) and a fixed, friendly message. Nothing from the backend's response or from the original error is passed along, so a message can't carry the token or anything from a deck.
* Both endpoints share one `request` function. I only extracted it after the 401 and 404 checks existed in both and had tests, so the tests could prove the refactor changed nothing. My first 404 check landed in the wrong function, and the test pointing at the right one failed at once, which is the case for having a single place.
* A server-error check I wrote with `||` instead of `&&` was true for every status, so every request failed, yet my 500 test still passed. The rest of the suite caught it. A test for the case where a rule applies can't tell a correct rule from an always-true one; it needs cases where the rule must not apply.
* Checked how `fetch` really fails against small throwaway servers instead of trusting memory. A stalled body fails later than the headers, a dropped connection is a `TypeError`, a status above 599 can come back (so the server-error range stops at 599, and any other unexpected status becomes a `bad_response` that names only the status), and a redirect to another host drops the `Authorization` header.
* The 10 second timeout uses `AbortSignal.timeout`. Fake timers don't move it in Node, so one test checks the mapping with a fake that throws the same `TimeoutError` a real timeout does, and another checks the 10 second value and the signal that gets passed to `fetch`.
* A test plants the token in response bodies and in the original errors, across ten kinds of failure and both endpoints, and checks that no 6-character piece of it reaches a message. It also checks the original error isn't kept as a `cause`, since logging an error would print it.
* The `mcp-server` suite is at 110 tests, and I checked every step by breaking the code on purpose. One break survived on purpose: `!response.ok` against `status !== 200` only differs for 2xx statuses these endpoints never send, so I left it. The config reader, schemas and client are done; the two tools are next.

---

## 🎯 Final Outcome

The result is a full-stack, multi-game deck tracker with real authentication, self-service password reset and account deletion, live card search across three different data sources, and a consistent, responsive design system — built around the idea that a player's identity should live in one place, not get split across a different app per game.

What started as a basic deck CRUD app grew into a complete account system with real security considerations — hashed passwords, single-use reset tokens, passkey sign-in with single-use challenges, cascading deletes, environment-scoped CORS — while staying focused on the one thing it's actually for: tracking what you play, across every game, under one name.

---

## 🚧 Work in Progress

**In progress**

* **Passkeys on the live site** — the feature is code-complete and tested, but the WebAuthn relying-party id and expected origin are read from environment variables that default to `localhost`. They need to be set to the real domain on the host, and then one real registration and sign-in needs to be verified end to end on the live site. Worth noting for later: passkeys are bound to that domain, so the final domain should be settled before real users start registering them.

* **MCP server** — v1 is two read-only tools, `list_my_decks` and `get_deck`. Done so far: the scaffold, the config reader, the response schemas for the deck list and a full deck, and the API client with its error handling (110 tests). Next: the two tools themselves, wiring the server to stdio, and a smoke test that lists them, then trying it in the MCP Inspector against my local backend with a real token.

**Known follow-ups from the passkey work** (noted along the way and deliberately not bundled into those PRs)

* Sweep expired, unused passkey challenges. They're single-use and short-lived, but abandoned prompts leave rows behind.
* Store each passkey's transport hints so browsers show the right device prompt instead of a generic one.
* Switch the older WebAuthn endpoints from `async def` to `def`: they make blocking database calls, which stalls the event loop.
* Config hardening: fail loudly when `DATABASE_URL` is missing instead of falling back to a hardcoded default, document every environment variable in an `.env.example`, and publish the local Postgres port on `localhost` only.
* `fetchCurrentUser` swallows failures, so a sign-in can resolve without a session being established. It's left as is for now to keep the passkey refactor behavior-neutral, and it's pinned down by a test.
* A browser-level end-to-end test using a virtual authenticator, to automate the one path the unit tests deliberately don't cover.
* Backfill tests for public profile listing and Union Arena search.

**Known follow-ups from the access-token work**

* Pokémon is still paused. The backend and database have since moved to paid Render plans, so measure live search latency before switching it back on.
* Mention access tokens in the Privacy Policy.
* Upgrade Vitest in the frontend and `mcp-server` together. `npm audit` reports two moderate advisories in Vitest 4.1.11, in dev tooling only (the production dependencies are clean). The fix is a patch release outside the exact version pin, so it goes in with the upgrade.

---

## ⚙️ Upcoming Project Features

* Rate limiting on auth endpoints
* MCP card tools and deck building, for meta analysis and building decks. The first MCP server only reads decks. Card questions need card effect text imported first, since DeckDen only stores each card's code, name and image, and building decks would need tokens that can write, which today's deliberately can't
* Semantic card search (pgvector) for finding cards that function alike
* Observability — error tracking and product analytics
* A scheduled job for the Union Arena card import instead of a manual script
* Open Graph previews for shareable profile links
* Dedicated mobile pass

---

## 📦 Use Cases

DeckDen can be used for:

* Tracking every deck you own across multiple TCGs in one place
* Sharing a single profile link at locals instead of a separate account per game
* Browsing the community for deck ideas before a tournament
* Keeping a public or private record of what you've built over time
* Showing off a collection across games on one profile

---

## 🌐 Live Preview

https://github.com/user-attachments/assets/5f4183e6-fe31-44fa-85c5-409be35bed2b

View the live project here:

https://deck-den.vercel.app

GitHub Repository:

https://github.com/rajan-daniel/deckDen

---

## 📄 License

MIT License — Copyright © 2026 Rajan Daniel

Free to use, modify, and distribute. See [LICENSE](LICENSE) for the full text.
