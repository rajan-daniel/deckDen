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

Scaffolded the Next.js frontend and FastAPI backend.

Built out the core data model — users, decks, deck cards — with JWT auth wired through both sides.

Got the full deck loop working end to end: create a deck, add cards, edit, delete, browse publicly.

Refactored card removal to work per-copy instead of editing quantities inline — cleaner for something you're doing constantly.

Fixed a hook-ordering bug on the deck detail page.

---

### 📅 7/28/2026

Wired up live card search — Yu-Gi-Oh! through YGOPRODeck, Pokémon through the official Pokémon TCG API, both called straight from the client.

Added player lookup so you can find someone by username from the nav.

Full visual pass — moved off default styling into an actual dark theme with a consistent component system. This is still the look the app uses.

Started building out Union Arena support. No public API exists for it, so this means a real database of my own — still a work in progress.

---

### 📅 8/17/2026

Redesigned deck browsing from a bare list into poster-style cards — big art on top, format and card count as floating chips, owner avatar, sizing normalized across games so a smaller Pokémon thumbnail doesn't read as lower-effort than a big Yu-Gi-Oh! one. Extended the same card component to My Decks and public profiles instead of leaving three different layouts scattered around the app.

Added a click-to-zoom view for individual cards, since the deck grid is dense by design and this is the one place you can actually read a card. Turned up a real bug doing it — Yu-Gi-Oh! art was getting its corners sliced by the modal's own border radius. Fixed with a padded mat around the art instead of clipping straight to the edge.

Found and fixed a real race condition on the deck detail page: the auth token resolves asynchronously on mount, so a fresh page load could fire once unauthenticated, get a 401, fall back to the public route, and have that stale failure land *after* a second, successful authenticated request already succeeded — owners opening their own private deck could see a false "Deck not found." Fixed with a request-generation guard so only the latest fetch is allowed to write to state.

Built out a real footer plus About, Contact, Privacy Policy, and Terms of Service pages, written to actually describe what the app does and collects rather than boilerplate.

Added password reset: single-use, 30-minute tokens hashed with SHA-256 — not bcrypt, since these are already high-entropy random tokens rather than low-entropy passwords, so a fast deterministic hash that supports exact-match lookup is the right tool. Delivered by email through Resend, with a console-log fallback when no API key is configured so the whole flow stays testable without real email infra.

Added self-service account deletion, cascading through a user's decks and cards the same way deck-to-card deletion already cascaded.

Replaced a hardcoded CORS origin with an environment variable — shipping `localhost:3000` as a literal would've broken every request the moment this deploys anywhere else.

Ran a full secrets audit before any of this goes public: confirmed no `.env` file or key has ever touched git history, not just that it's gitignored now.

---

### 📅 8/19/2026

Closed out the Union Arena gap. No public API exists for it, so I wrote a scraper against the official card list site instead — it reads the set/series dropdown itself rather than a hardcoded list, so a newly-released set gets picked up automatically the next time it runs, then upserts every card by its code so re-running it is always safe.

Ran it for real: 46 sets, 6,343 cards, all with working art. Verified it end to end — not just that the script finished, but that the actual card search in the deck builder returns real results with real images.

Found one small data quirk in the process and left it documented rather than hiding it: a handful of alternate-art variant cards carry their own code as a prefix in the name field, a quirk in how the source site formats alt text for those specific variants. Cosmetic, not broken — still fully searchable, still linked to the right art.

Made `SECRET_KEY` fail loudly instead of quietly falling back to a known default if it's ever missing — the app now refuses to start rather than running insecurely without anyone noticing. Also found and cleaned up a second, unsynced copy of that same value that a previous pass had missed.

Turned real user testing into two more fixes on the Union Arena search: it only matched the card name field and capped results at 8 with no explicit order, so a common character with many printings could silently push a real card out of the visible results. Now it also matches the card code, orders results deterministically, and raises the cap to 50. Cleared out two leftover placeholder rows from before the real scraper existed while I was in there.

Added an optional play style tag to decks — Competitive, Meta, Casual, Fun, Beginner, Advanced, Budget, or Test — shown as a chip on the deck page and on the deck cards. Genuinely optional: no tag is the default, not a forced choice.

Added a "Done editing" button to the deck page. Every add/remove already saves instantly, but testing showed people still instinctively look for a save button when they're finished — this doesn't persist anything new, it just gives that moment of closure and takes you back to your deck list.

---

### 📅 8/20/2026

Replaced the old icon with a proper logo mark, colored with the same sky-to-purple gradient the rest of the app already uses, no background badge behind it this time — just the mark itself, in the navbar, the footer, and the favicon. Redid the favicon centering math from scratch, since the new mark doesn't fill its own bounding box the way the old one did — a naive "scale the whole viewBox" transform left it small and off-center until it was centered on the mark's actual visible bounds instead.

---

### 📅 8/21/2026

Deployed for real: Railway for the backend and Postgres, Vercel for the frontend. First deploy on either platform for me, so this was also the first time finding out `--reload` has no business being in a production Dockerfile — moved it into a docker-compose override so local dev keeps hot-reloading while the image Railway actually builds doesn't carry a dev-only flag.

The production database starts completely empty — no local test data, but also no Union Arena cards, which meant re-running the import script against it, this time over `railway ssh` into the real deployed container instead of `railway run` (which executes locally with Railway's env vars injected, not inside the container — good to actually understand the difference instead of assuming).

Went live and immediately hit two real, separate misconfigurations during the smoke test rather than assuming a green build meant a working site: the backend was rejecting the frontend's requests outright because `CORS_ORIGINS` didn't exactly match the real Vercel URL, and separately the frontend was calling a backend URL that turned out to be a placeholder I'd used in an example earlier and never corrected — worth admitting since it's exactly the kind of mistake that's easy to wave through if you don't actually test the live thing end to end instead of trusting each piece in isolation.

Verified a custom domain with Resend (a subdomain of my own site, isolated from my personal domain's existing mail setup on purpose) so password reset emails now come from a real address instead of the shared `onboarding@resend.dev` sandbox, which only ever delivers to the account owner regardless of who signs up.

Real usage surfaced two more bugs. Pokémon search was prefix-only (`name:query*`), so it silently missed anything where the search term wasn't the start of the name — "Snorlax" wouldn't find "Hop's Snorlax." Fixed by wildcarding both sides. While digging into a slowness complaint, found the actual cause wasn't the app at all: the free Pokémon TCG API is being sunset in favor of a paid successor (Scrydex, no free tier, starts at $29/month) and is returning real intermittent server errors under normal use now — confirmed directly, not assumed. Decided to keep using the free endpoint as-is rather than pay for a hobby project or take on a much bigger scrape than Union Arena's, but fixed the part that was actually misleading: a failed request was being treated identically to "zero results," so a real outage looked exactly like "no cards found." Now it surfaces as an actual error instead of a false negative.

---

## 🎯 Final Outcome

The result is a full-stack, multi-game deck tracker with real authentication, self-service password reset and account deletion, live card search across three different data sources, and a consistent, responsive design system — built around the idea that a player's identity should live in one place, not get split across a different app per game.

What started as a basic deck CRUD app grew into a complete account system with real security considerations — hashed passwords, single-use reset tokens, cascading deletes, environment-scoped CORS — while staying focused on the one thing it's actually for: tracking what you play, across every game, under one name.

---

## ⚙️ Upcoming Project Features

* Automated test coverage, backend and frontend
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

View the live project here:

https://deck-den.vercel.app

GitHub Repository:

https://github.com/rajan-daniel/deckDen

---

## 📄 License

Copyright © 2026 Rajan Daniel

All Rights Reserved.
