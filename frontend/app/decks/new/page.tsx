"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/app/components/protected-route";

const GAMES = [
  { name: "Yu-Gi-Oh!", slug: "yugioh", color: "bg-purple-600" },
  { name: "Pokemon", slug: "pokemon", color: "bg-yellow-500" },
  { name: "Union Arena", slug: "union-arena", color: "bg-blue-600" },
];

function GamePicker() {
  return (
    <div className="max-w-2xl mx-auto mt-16 px-4">
      <h1 className="text-2xl font-semibold mb-2">Create a deck</h1>
      <p className="text-gray-500 text-sm mb-8">Which game is this deck for?</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {GAMES.map((game) => (
          <Link
            key={game.slug}
            href={`/decks/new/${game.slug}`}
            className={`${game.color} text-white rounded-lg px-6 py-10 text-center font-medium hover:opacity-90 transition`}
          >
            {game.name}
          </Link>
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