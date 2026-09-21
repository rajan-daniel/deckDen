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
* Vercel
* pytest
* Vitest + React Testing Library

---

## 🚀 Features

* 🎴 Build and save decklists across Yu-Gi-Oh!, Pokémon, and Union Arena
* 🔍 Live card search pulled straight from each game's real card database
* 🌐 Public profiles that show everything a player builds across every game, not just one
* 🔒 Public or private visibility, set per deck
* 🏷️ Optional play style tags (Competitive, Meta, Casual, Fun, Beginner, Advanced, Budget, Test)
* 🔐 Secure authentication — hashed passwords, JWT sessions
* ✉️ Self-service password reset via email
* 🗑️ Self-service account deletion, with data actually cleaned up behind it
* 🔎 Click-to-zoom card focus view, sized consistently across games
* 📱 Fully responsive, consistent dark-themed design system
* 📄 Real legal pages — About, Contact, Privacy Policy, Terms of Service

---

## 📍 The Process

DeckDen started as a way to solve a problem I kept running into as a multi-game player myself, and grew from a basic deck CRUD app into a full account system with password recovery, self-service account deletion, and a proper design system.

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

---

## 🎯 Final Outcome

The result is a full-stack, multi-game deck tracker with real authentication, self-service password reset and account deletion, live card search across three different data sources, and a consistent, responsive design system — built around the idea that a player's identity should live in one place, not get split across a different app per game.

What started as a basic deck CRUD app grew into a complete account system with real security considerations — hashed passwords, single-use reset tokens, cascading deletes, environment-scoped CORS — while staying focused on the one thing it's actually for: tracking what you play, across every game, under one name.

---

## ⚙️ Upcoming Project Features

* Rate limiting on auth endpoints
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
