"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api";
import { ProtectedRoute } from "@/app/components/protected-route";
import { Loading } from "@/app/components/loading";
import { DeckCard, DeckSummary } from "@/app/components/deck-card";
import { PageBanner } from "@/app/components/page-banner";

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

  return (
    <>
      <PageBanner
        tag="010101_MINE"
        title="My Decks"
        subtitle="Every deck you've built, across every game."
      >
        <Link href="/decks/new" className="btn-primary py-2.5 px-5">
          + New deck
        </Link>
      </PageBanner>

      <div className="mx-auto w-full max-w-7xl px-4 py-10 pb-16 sm:px-6">
        {isLoading ? (
          <Loading />
        ) : error ? (
          <div className="text-center mt-8 text-red-400">{error}</div>
        ) : decks.length === 0 ? (
          <p className="text-neutral-400 text-sm">
            You haven&apos;t created any decks yet.{" "}
            <Link href="/decks/new" className="text-brand-hi font-medium hover:underline">
              Create your first one
            </Link>
            .
          </p>
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

export default function MyDecksPage() {
  return (
    <ProtectedRoute>
      <MyDecksList />
    </ProtectedRoute>
  );
}
