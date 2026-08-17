"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { Loading } from "@/app/components/loading";
import { DeckCard, DeckSummary } from "@/app/components/deck-card";

export default function UserProfilePage() {
  const params = useParams();
  const username = params.username as string;

  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUserDecks() {
      try {
        const data = await apiFetch<DeckSummary[]>(`/users/${encodeURIComponent(username)}/decks`);
        setDecks(data);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    }
    loadUserDecks();
  }, [username]);

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return <div className="text-center mt-16 text-red-400">{error}</div>;
  }

  return (
    <div className="w-full max-w-5xl mx-auto mt-16 px-4 pb-16">
      <div className="flex items-center gap-3 mb-1">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-purple-600 text-white font-semibold shadow-sm shadow-purple-500/20">
          {username.slice(0, 1).toUpperCase()}
        </span>
        <h1 className="text-2xl font-semibold">{username}</h1>
      </div>
      <p className="text-neutral-400 text-sm mb-8 ml-[52px]">Public decks</p>

      {decks.length === 0 ? (
        <p className="text-neutral-400 text-sm">No public decks yet.</p>
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
