"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { GAME_ACCENT } from "@/lib/games";
import { Loading } from "@/app/components/loading";

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
              <p className="font-medium text-neutral-100 group-hover:text-sky-400 transition-colors">
                {deck.name}
              </p>
              <p className="text-sm text-neutral-400 mt-1">
                {deck.game}
                {deck.format && ` · ${deck.format}`}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}