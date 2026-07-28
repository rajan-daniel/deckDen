"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";

type Deck = {
  id: number;
  name: string;
  game: string;
  format: string | null;
  owner_id: number;
};

const GAMES = ["All", "Yu-Gi-Oh!", "Pokemon", "Union Arena"] as const;

export default function PublicDecksPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<(typeof GAMES)[number]>("All");

  useEffect(() => {
    async function loadDecks() {
      setIsLoading(true);
      setError(null);
      try {
        const query = selectedGame === "All" ? "" : `?game=${encodeURIComponent(selectedGame)}`;
        const data = await apiFetch<Deck[]>(`/decks${query}`);
        setDecks(data);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load decks");
      } finally {
        setIsLoading(false);
      }
    }

    loadDecks();
  }, [selectedGame]);

  return (
    <div className="max-w-2xl mx-auto mt-16 px-4">
      <h1 className="text-2xl font-semibold mb-6">Browse Decks</h1>

      <div className="flex gap-2 mb-6">
        {GAMES.map((game) => (
          <button
            key={game}
            onClick={() => setSelectedGame(game)}
            className={`text-sm border rounded px-3 py-1 ${
              selectedGame === game ? "bg-black text-white" : ""
            }`}
          >
            {game}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : error ? (
        <p className="text-red-600 text-sm">{error}</p>
      ) : decks.length === 0 ? (
        <p className="text-gray-500 text-sm">No public decks yet for this game.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {decks.map((deck) => (
            <li key={deck.id}>
              <Link
                href={`/decks/${deck.id}`}
                className="flex justify-between items-center border rounded px-4 py-3 hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium">{deck.name}</p>
                  <p className="text-sm text-gray-500">
                    {deck.game}
                    {deck.format && ` · ${deck.format}`}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}