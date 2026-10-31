"use client";

import { ProtectedRoute } from "@/app/components/protected-route";
import { GameCard } from "@/app/components/game-card";
import { PageBanner } from "@/app/components/page-banner";
import { GAMES } from "@/lib/games";

function GamePicker() {
  return (
    <>
      <PageBanner
        tag="010101_NEW"
        title="Create a deck"
        subtitle="Which game is this deck for?"
      />
      <div className="w-full max-w-4xl mx-auto px-4 py-12 pb-16">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          {GAMES.map((game) => (
            <GameCard
              key={game.slug}
              game={game}
              href={`/decks/new/${game.slug}`}
              className="sm:w-72"
            />
          ))}
        </div>
      </div>
    </>
  );
}

export default function NewDeckGamePickerPage() {
  return (
    <ProtectedRoute>
      <GamePicker />
    </ProtectedRoute>
  );
}
