"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { Loading } from "@/app/components/loading";
import { DeckCard, DeckSummary } from "@/app/components/deck-card";
import { PageBanner } from "@/app/components/page-banner";
import { CopyLinkButton } from "@/app/components/copy-link-button";

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

  const gameCount = new Set(decks.map((deck) => deck.game)).size;

  return (
    <>
      <PageBanner
        tag="010101_PROFILE"
        title={username}
        leading={
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand text-2xl font-extrabold text-white shadow-lg shadow-brand/30 sm:h-16 sm:w-16">
            {username.slice(0, 1).toUpperCase()}
          </span>
        }
        subtitle="Public decks"
      >
        <span className="badge">
          {decks.length} {decks.length === 1 ? "deck" : "decks"}
        </span>
        <span className="badge">
          {gameCount} {gameCount === 1 ? "game" : "games"}
        </span>
        <CopyLinkButton />
      </PageBanner>

      <div className="mx-auto w-full max-w-7xl px-4 py-10 pb-16 sm:px-6">
        {decks.length === 0 ? (
          <p className="text-neutral-400 text-sm">No public decks yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {decks.map((deck, i) => (
              <DeckCard key={deck.id} deck={deck} index={i} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
