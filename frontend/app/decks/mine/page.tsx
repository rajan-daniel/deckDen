"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api";
import { ProtectedRoute } from "@/app/components/protected-route";
import { Loading } from "@/app/components/loading";
import { DeckCard, DeckSummary } from "@/app/components/deck-card";

function MyDecksList() {
  const { token } = useAuth();
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDecks() {
      try {
        const data = await apiFetch<DeckSummary[]>("/me/decks", { token });
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {decks.map((deck) => (
            <DeckCard key={deck.id} deck={deck} />
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
