import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/app/components/page-hero";
import { GAMES } from "@/lib/games";

export const metadata: Metadata = {
  title: "About · DeckDen",
  description: "What DeckDen is, how it works, and the games it supports.",
};

const STEPS = [
  {
    title: "Create an account",
    body: "Sign up with a username, email, and password — it takes seconds and it's free.",
  },
  {
    title: "Start a deck",
    body: "Pick a game, name your deck, and choose a format and description if you'd like.",
  },
  {
    title: "Search and add cards",
    body: "Look up cards by name and add them straight into your Main or Extra deck with live artwork.",
  },
  {
    title: "Share it, or keep it private",
    body: "Make a deck public to show it off on your profile and in Browse Decks, or keep it just for you.",
  },
];

export default function AboutPage() {
  return (
    <div className="flex-1 flex flex-col items-center px-6 pb-24">
      <PageHero
        eyebrow="About"
        title="Decklists, built for players."
        subtitle="DeckDen is a home for your trading card game decks — build them, keep track of them, and show them off, all in one clean, fast place."
      />

      <div className="w-full max-w-3xl legal-content">
        <h2>What DeckDen does</h2>
        <p>
          DeckDen lets you build and save decklists across multiple trading
          card games, search a live card database while you build, and
          publish decks publicly so other players can browse and get ideas
          from your builds. Every account gets a public profile page that
          collects the decks you've chosen to share.
        </p>

        <h2>How it works</h2>
        <ul>
          {STEPS.map((step) => (
            <li key={step.title}>
              <strong>{step.title}.</strong> {step.body}
            </li>
          ))}
        </ul>

        <h2>Supported games</h2>
        <p>
          DeckDen currently supports three games, each with its own card
          search hooked up to a real card database:
        </p>
        <ul>
          {GAMES.map((game) => (
            <li key={game.slug}>
              <strong>{game.name}</strong>
              {game.name === "Yu-Gi-Oh!" &&
                " — search backed by the YGOPRODeck database, with separate Main and Extra deck sections."}
              {game.name === "Pokemon" &&
                " — search backed by the Pokémon TCG API."}
              {game.name === "Union Arena" &&
                " — search backed by DeckDen's own growing card database."}
            </li>
          ))}
        </ul>

        <h2>Why it exists</h2>
        <p>
          Most deck-building tools are built around a single game, or bury
          your decklist under ads and clutter. DeckDen is a smaller, faster
          alternative: pick a game, build a deck, and get out of the way —
          whether you're theory-crafting something new or just want a clean
          place to keep track of what you're playing.
        </p>

        <h2>Open source</h2>
        <p>
          DeckDen is a solo, ongoing project — built with Next.js and
          Tailwind CSS on the frontend, and FastAPI with PostgreSQL on the
          backend. The code is public on{" "}
          <a
            href="https://github.com/rajan-daniel/deckDen"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          .
        </p>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <Link href="/signup" className="btn-primary px-6 py-3 text-base">
          Create your first deck
        </Link>
        <Link href="/decks" className="btn-secondary px-6 py-3 text-base">
          Browse decks
        </Link>
      </div>
    </div>
  );
}
