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
    <div>
      <input
        type="text"
        placeholder="Search for a card..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="border rounded px-3 py-2 text-sm w-full mb-3"
      />

      {isSearching && <p className="text-xs text-gray-400">Searching...</p>}

      {!isSearching && query.trim().length >= 2 && results.length === 0 && (
        <p className="text-xs text-gray-400">No results found.</p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {results.map((card) => (
          <button
            key={card.externalId}
            type="button"
            onClick={() => onSelectCard(card)}
            className="border rounded overflow-hidden hover:opacity-80 transition text-left"
          >
            {card.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.imageUrl} alt={card.name} className="w-full h-auto" />
            ) : (
              <div className="p-2 text-xs">{card.name}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}