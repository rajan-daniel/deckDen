import Link from "next/link";
import { GAMES } from "@/lib/games";
import { GameCard } from "@/app/components/game-card";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center px-6">
      <section className="w-full max-w-3xl flex flex-col items-center text-center pt-24 pb-20">
        <span className="badge-accent mb-5 animate-fade-in-up">
          Build · Track · Share
        </span>
        <h1
          className="text-4xl sm:text-5xl font-semibold tracking-tight leading-tight animate-fade-in-up"
          style={{ animationDelay: "60ms" }}
        >
          Your decklists, <span className="gradient-text">beautifully</span>{" "}
          organized.
        </h1>
        <p
          className="mt-5 max-w-xl text-neutral-400 text-lg animate-fade-in-up"
          style={{ animationDelay: "120ms" }}
        >
          DeckDen is where you build, browse, and share decks across
          Yu-Gi-Oh!, Pokémon, and Union Arena — all in one clean, fast place.
        </p>

        <div
          className="mt-8 flex flex-col sm:flex-row gap-3 animate-fade-in-up"
          style={{ animationDelay: "180ms" }}
        >
          <Link href="/decks/new" className="btn-primary px-6 py-3 text-base">
            Create a deck
          </Link>
          <Link
            href="/decks"
            className="btn-secondary px-6 py-3 text-base"
          >
            Browse decks
          </Link>
        </div>
      </section>

      <section className="w-full max-w-4xl pb-24">
        <p className="text-center text-sm font-medium text-neutral-400 mb-5 uppercase tracking-wide">
          Jump into a game
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {GAMES.map((game, i) => (
            <GameCard
              key={game.slug}
              game={game}
              href={`/decks/browse/${game.slug}`}
              className="animate-fade-in-up"
              style={{ animationDelay: `${240 + i * 60}ms` }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
