"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api";
import { ProtectedRoute } from "@/app/components/protected-route";
import { GAME_ACCENT } from "@/lib/games";
import { Loading } from "@/app/components/loading";

type Deck = {
  id: number;
  name: string;
  game: string;
  is_public: boolean;
};

function MyDecksList() {
  const { token } = useAuth();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDecks() {
      try {
        const data = await apiFetch<Deck[]>("/me/decks", { token });
        setDecks(data);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load decks");
      } finally {
        setIsLoading(false);
      }
    }

    loadDecks();
  }, [token]);

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return <div className="text-center mt-16 text-red-400">{error}</div>;
  }

  return (
    <div className="w-full max-w-5xl mx-auto mt-16 px-4 pb-16">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">My Decks</h1>
        <Link href="/decks/new" className="btn-primary py-2 px-4">
          + New deck
        </Link>
      </div>

      {decks.length === 0 ? (
        <p className="text-neutral-400 text-sm">
          You haven&apos;t created any decks yet.{" "}
          <Link href="/decks/new" className="text-sky-400 font-medium hover:underline">
            Create your first one
          </Link>
          .
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((deck) => (
            <Link
              key={deck.id}
              href={`/decks/${deck.id}`}
              className="card-surface group relative overflow-hidden p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/15 hover:border-sky-500/50"
            >
              <span
                className={`absolute top-0 left-0 right-0 h-1.5 ${GAME_ACCENT[deck.game] ?? "bg-gradient-to-r from-sky-500 to-purple-600"}`}
              />
              <div className="flex justify-between items-start gap-2">
                <p className="font-medium text-neutral-100 group-hover:text-sky-400 transition-colors">
                  {deck.name}
                </p>
                {!deck.is_public && (
                  <span className="badge shrink-0">Private</span>
                )}
              </div>
              <p className="text-sm text-neutral-400 mt-1">{deck.game}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MyDecksPage() {
  return (
    <ProtectedRoute>
      <MyDecksList />
    </ProtectedRoute>
  );
}