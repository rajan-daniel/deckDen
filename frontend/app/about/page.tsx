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
        <h2>Why I built this</h2>
        <p>
          I'm a multi-game TCG player myself, and the thing I kept running
          into was that every game has its own separate deck tracker — one
          app for Yu-Gi-Oh!, another for Pokémon, another for whatever else
          you're into. None of them talk to each other, and none of them
          are built around the actual <em>player</em>. That never made much
          sense to me, because most TCG players I know don't just play one
          game — you've got a Pokémon deck for league, a Yu-Gi-Oh! deck for
          locals, and something else you're brewing on the side.
        </p>
        <p>
          So I wanted one place where the player comes first: a single
          profile that shows everything you play, across every game, tied
          to one username.
        </p>
        <blockquote>
          "Yo, check my account on DeckDen" — that's the whole idea. One
          link, one username, your whole collection of decks across every
          game you play.
        </blockquote>

        <h2>What DeckDen does</h2>
        <p>
          DeckDen lets you build and save decklists across multiple trading
          card games, search a live card database while you build, and
          publish decks publicly so other players can browse and get ideas
          from your builds. Every account gets a public profile page that
          collects the decks you've chosen to share — across every game you
          play, not just one.
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
