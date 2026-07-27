"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api";
import { ProtectedRoute } from "@/app/components/protected-route";

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
    return <div className="text-center mt-16 text-gray-500">Loading...</div>;
  }

  if (error) {
    return <div className="text-center mt-16 text-red-600">{error}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto mt-16 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">My Decks</h1>
        <Link href="/decks/new" className="text-sm underline">
          + New deck
        </Link>
      </div>

      {decks.length === 0 ? (
        <p className="text-gray-500 text-sm">
          You haven&apos;t created any decks yet.{" "}
          <Link href="/decks/new" className="underline">
            Create your first one
          </Link>
          .
        </p>
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
                  <p className="text-sm text-gray-500">{deck.game}</p>
                </div>
                {!deck.is_public && (
                  <span className="text-xs border rounded px-2 py-1">Private</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
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