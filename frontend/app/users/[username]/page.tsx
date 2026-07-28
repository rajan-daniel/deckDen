"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";

type Deck = {
  id: number;
  name: string;
  game: string;
  format: string | null;
};

export default function UserProfilePage() {
  const params = useParams();
  const username = params.username as string;

  const [decks, setDecks] = useState<Deck[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUserDecks() {
      try {
        const data = await apiFetch<Deck[]>(`/users/${encodeURIComponent(username)}/decks`);
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
    return <div className="text-center mt-16 text-gray-500">Loading...</div>;
  }

  if (error) {
    return <div className="text-center mt-16 text-red-600">{error}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto mt-16 px-4">
      <h1 className="text-2xl font-semibold mb-1">{username}</h1>
      <p className="text-gray-500 text-sm mb-8">Public decks</p>

      {decks.length === 0 ? (
        <p className="text-gray-500 text-sm">No public decks yet.</p>
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