"use client";

import { useEffect, useState } from "react";
import { getCardSearchFn, NormalizedCard } from "@/lib/card-apis";
import { EmptyState, SearchIcon, ZoomIcon } from "@/app/components/empty-state";
import { CardFocusModal, FocusedCard } from "@/app/components/card-focus-modal";

export type DeckSection = "main" | "extra";

type Props = {
  game: string;
  onSelectCard: (card: NormalizedCard, section?: DeckSection) => void;
};

export function CardSearch({ game, onSelectCard }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NormalizedCard[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [focusedCard, setFocusedCard] = useState<FocusedCard | null>(null);

  const isYugioh = game === "Yu-Gi-Oh!";
  const hasResults = results.length > 0;

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setSearchFailed(false);
      return;
    }

    setIsSearching(true);
    setSearchFailed(false);
    const searchFn = getCardSearchFn(game);

    const timer = setTimeout(async () => {
      try {
        const found = await searchFn(query);
        setResults(found);
      } catch {
        setResults([]);
        setSearchFailed(true);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, game]);

  return (
    <div>
      <div className="search-row">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <input
          type="text"
          placeholder="Search for a card..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input-field h-full pl-9"
        />
      </div>

      <div className="tray">
        <div
          className={
            hasResults
              ? "tray-body grid grid-cols-4 gap-3 items-start content-start"
              : "tray-body flex items-center justify-center"
          }
        >
          {query.trim().length < 2 ? (
            <EmptyState
              title="Search for a card to add it to your deck."
              icon={<SearchIcon className="h-7 w-7 text-neutral-600" />}
            />
          ) : isSearching ? (
            <EmptyState
              title="Searching..."
              icon={<SearchIcon className="h-7 w-7 text-neutral-600" />}
            />
          ) : searchFailed ? (
            <EmptyState
              title="Couldn't reach the card database. Check your connection and try again."
              icon={<SearchIcon className="h-7 w-7 text-neutral-600" />}
            />
          ) : !hasResults ? (
            <EmptyState
              title="No results found."
              icon={<SearchIcon className="h-7 w-7 text-neutral-600" />}
            />
          ) : (
            results.map((card) =>
              isYugioh ? (
                <div key={card.externalId} className="grid-card group">
                  <div className="grid-card-frame">
                    {card.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={card.imageUrl} alt={card.name} className="grid-card-img" />
                    ) : (
                      <div className="p-2 text-xs min-h-24 flex items-center text-neutral-300">
                        {card.name}
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="absolute inset-x-0 bottom-1.5 flex items-center justify-center gap-1.5 opacity-0 translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                      <button
                        type="button"
                        onClick={() => onSelectCard(card, "main")}
                        className="pill-btn-main"
                      >
                        + Main
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectCard(card, "extra")}
                        className="pill-btn-extra"
                      >
                        + Extra
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFocusedCard({ name: card.name, imageUrl: card.imageUrl ?? null, game })}
                      aria-label={`Enlarge ${card.name}`}
                      className="zoom-btn !bottom-auto !top-1.5"
                    >
                      <ZoomIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={card.externalId}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectCard(card)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectCard(card);
                    }
                  }}
                  className="grid-card group text-left cursor-pointer"
                >
                  <div className="grid-card-frame">
                    {card.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={card.imageUrl} alt={card.name} className="grid-card-img" />
                    ) : (
                      <div className="p-2 text-xs min-h-24 flex items-center text-neutral-300">
                        {card.name}
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-purple-700 shadow-md translate-y-1 transition-transform duration-300 group-hover:translate-y-0">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-4 w-4"
                        >
                          <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                        </svg>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFocusedCard({ name: card.name, imageUrl: card.imageUrl ?? null, game });
                      }}
                      aria-label={`Enlarge ${card.name}`}
                      className="zoom-btn"
                    >
                      <ZoomIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ),
            )
          )}
        </div>
      </div>
      <CardFocusModal card={focusedCard} onClose={() => setFocusedCard(null)} />
    </div>
  );
}
