"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { GAMES } from "@/lib/games";
import { Loading } from "./loading";
import { DeckCard, type DeckSummary } from "./deck-card";
import { PageBanner } from "./page-banner";

type Props = {
  /** The game to show, or undefined for every game. */
  gameName?: string;
};

function pillClass(active: boolean) {
  return `inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-5 py-2 text-sm font-semibold transition-colors ${
    active
      ? "border-brand bg-brand text-white shadow-lg shadow-brand/30"
      : "border-neutral-800 bg-neutral-900 text-neutral-200 hover:border-neutral-600 hover:text-white"
  }`;
}

// The public deck listing, shared by /decks (all games) and
// /decks/browse/[game] (one game). The pills navigate between them.
export function BrowseDecks({ gameName }: Props) {
  // The result remembers which game it was loaded for, so switching games
  // reads as "loading" until the new answer lands, with no setState in the effect body.
  const key = gameName ?? "all";
  const [result, setResult] = useState<{
    key: string;
    decks: DeckSummary[];
    error: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDecks() {
      try {
        const path = gameName ? `/decks?game=${encodeURIComponent(gameName)}` : "/decks";
        const data = await apiFetch<DeckSummary[]>(path);
        if (!cancelled) setResult({ key, decks: data, error: null });
      } catch (err) {
        if (!cancelled) {
          setResult({
            key,
            decks: [],
            error: err instanceof ApiError ? err.message : "Failed to load decks",
          });
        }
      }
    }
    loadDecks();

    return () => {
      cancelled = true;
    };
  }, [gameName, key]);

  const isLoading = result?.key !== key;
  const decks = result?.decks ?? [];
  const error = result?.error ?? null;

  return (
    <>
      <PageBanner
        tag="010101_BROWSE"
        title={gameName ? `${gameName} Decks` : "Browse Decks"}
        subtitle="Public decklists from players across every game."
      />

      <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6">
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 py-8 sm:mx-0 sm:px-0">
          <Link href="/decks" className={pillClass(!gameName)}>
            All games
          </Link>
          {GAMES.map((game) => (
            <Link
              key={game.slug}
              href={`/decks/browse/${game.slug}`}
              className={`${pillClass(gameName === game.name)} whitespace-nowrap`}
            >
              {game.name}
            </Link>
          ))}
        </div>

        {isLoading ? (
          <Loading />
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : decks.length === 0 ? (
          <p className="text-sm text-neutral-400">
            {gameName ? "No public decks yet for this game." : "No public decks yet."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {decks.map((deck, i) => (
              <DeckCard key={deck.id} deck={deck} index={i} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
