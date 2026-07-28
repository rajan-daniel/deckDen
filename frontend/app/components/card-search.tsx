"use client";

import { useEffect, useState } from "react";
import { getCardSearchFn, NormalizedCard } from "@/lib/card-apis";

type Props = {
  game: string;
  onSelectCard: (card: NormalizedCard) => void;
};

export function CardSearch({ game, onSelectCard }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NormalizedCard[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const searchFn = getCardSearchFn(game);

    const timer = setTimeout(async () => {
      const found = await searchFn(query);
      setResults(found);
      setIsSearching(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [query, game]);

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Search for a card..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="border rounded px-3 py-2 text-sm w-full"
      />

      {isSearching && <p className="text-xs text-gray-400 mt-1">Searching...</p>}

      {!isSearching && query.trim().length >= 2 && results.length === 0 && (
        <p className="text-xs text-gray-400 mt-1">No results found.</p>
      )}

      {results.length > 0 && (
        <ul className="absolute z-10 bg-white border rounded mt-1 w-full max-h-64 overflow-y-auto shadow-md">
          {results.map((card) => (
            <li key={card.externalId}>
              <button
                type="button"
                onClick={() => {
                  onSelectCard(card);
                  setQuery("");
                  setResults([]);
                }}
                className="flex items-center gap-3 w-full px-3 py-2 text-sm hover:bg-gray-50 text-left"
              >
                {card.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={card.imageUrl} alt={card.name} className="w-8 h-auto" />
                )}
                <span>{card.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}