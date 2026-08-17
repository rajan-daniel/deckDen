"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { SLUG_TO_GAME } from "@/lib/games";
import { Loading } from "@/app/components/loading";
import { DeckCard, DeckSummary } from "@/app/components/deck-card";

export default function BrowseByGamePage() {
  const params = useParams();
  const slug = params.game as string;
  const gameName = SLUG_TO_GAME[slug];

  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!gameName) {
      setIsLoading(false);
      return;
    }

    async function loadDecks() {
      try {
        const data = await apiFetch<DeckSummary[]>(`/decks?game=${encodeURIComponent(gameName)}`);
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
      <div className="text-center mt-16 text-red-400">
        Unknown game. Go back and pick again.
      </div>
    );
  }

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="w-full max-w-5xl mx-auto mt-16 px-4 pb-16">
      <h1 className="text-2xl font-semibold mb-6">{gameName} Decks</h1>

      {error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : decks.length === 0 ? (
        <p className="text-neutral-400 text-sm">No public decks yet for this game.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {decks.map((deck) => (
            <DeckCard key={deck.id} deck={deck} />
          ))}
        </div>
      )}
    </div>
  );
}
