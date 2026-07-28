"use client";

import { ProtectedRoute } from "@/app/components/protected-route";
import { GameCard } from "@/app/components/game-card";
import { GAMES } from "@/lib/games";

function GamePicker() {
  return (
    <div className="w-full max-w-2xl mx-auto mt-16 px-4">
      <h1 className="text-2xl font-semibold mb-2">Create a deck</h1>
      <p className="text-neutral-400 text-sm mb-8">Which game is this deck for?</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {GAMES.map((game) => (
          <GameCard key={game.slug} game={game} href={`/decks/new/${game.slug}`} />
        ))}
      </div>
    </div>
  );
}

export default function NewDeckGamePickerPage() {
  return (
    <ProtectedRoute>
      <GamePicker />
    </ProtectedRoute>
  );
}