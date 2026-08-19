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

---

## 🎯 Final Outcome

The result is a full-stack, multi-game deck tracker with real authentication, self-service password reset and account deletion, live card search across three different data sources, and a consistent, responsive design system — built around the idea that a player's identity should live in one place, not get split across a different app per game.

What started as a basic deck CRUD app grew into a complete account system with real security considerations — hashed passwords, single-use reset tokens, cascading deletes, environment-scoped CORS — while staying focused on the one thing it's actually for: tracking what you play, across every game, under one name.

---

## ⚙️ Upcoming Project Features

* Automated test coverage, backend and frontend
* Verified sending domain for password reset email (currently on Resend's shared test domain)
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

_[add your deployed URL here once it's live]_

GitHub Repository:

https://github.com/rajan-daniel/deckDen

---

## 📄 License

Copyright © 2026 Rajan Daniel

All Rights Reserved.
