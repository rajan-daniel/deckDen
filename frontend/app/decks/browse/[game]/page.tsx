"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { SLUG_TO_GAME } from "@/lib/games";

type Deck = {
  id: number;
  name: string;
  game: string;
  format: string | null;
};

export default function BrowseByGamePage() {
  const params = useParams();
  const slug = params.game as string;
  const gameName = SLUG_TO_GAME[slug];

  const [decks, setDecks] = useState<Deck[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!gameName) {
      setIsLoading(false);
      return;
    }

    async function loadDecks() {
      try {
        const data = await apiFetch<Deck[]>(`/decks?game=${encodeURIComponent(gameName)}`);
        setDecks(data);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load decks");
      } finally {
        setIsLoading(false);
      }
    }
    loadDecks();
  }, [gameName]);

  if (!gameName) {
    return (
      <div className="text-center mt-16 text-red-600">
        Unknown game. Go back and pick again.
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-center mt-16 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto mt-16 px-4">
      <h1 className="text-2xl font-semibold mb-6">{gameName} Decks</h1>

      {error ? (
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