"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api";

type DeckCard = {
  id: number;
  card_name: string;
  quantity: number;
  category: string | null;
  image_url: string | null;
};

type Deck = {
  id: number;
  name: string;
  game: string;
  format: string | null;
  description: string | null;
  is_public: boolean;
  owner_id: number;
  cards: DeckCard[];
};

export default function DeckDetailPage() {
  const params = useParams();
  const deckId = params.deck_id;
  const { token } = useAuth();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDeck() {
      try {
        // Try the "my decks" endpoint first (works if I own it, even if private)
        const data = await apiFetch<Deck>(`/me/decks/${deckId}`, { token });
        setDeck(data);
      } catch (err) {
        // Fall back to the public endpoint (works if it's public, no auth needed)
        try {
          const data = await apiFetch<Deck>(`/decks/${deckId}`);
          setDeck(data);
        } catch (err2) {
          setError(err2 instanceof ApiError ? err2.message : "Deck not found");
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadDeck();
  }, [deckId, token]);

  if (isLoading) {
    return <div className="text-center mt-16 text-gray-500">Loading...</div>;
  }

  if (error || !deck) {
    return <div className="text-center mt-16 text-red-600">{error ?? "Deck not found"}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto mt-16 px-4">
      <div className="flex justify-between items-start mb-2">
        <h1 className="text-2xl font-semibold">{deck.name}</h1>
        {!deck.is_public && <span className="text-xs border rounded px-2 py-1">Private</span>}
      </div>

      <p className="text-sm text-gray-500 mb-1">
        {deck.game}
        {deck.format && ` · ${deck.format}`}
      </p>

      {deck.description && <p className="text-gray-700 mt-4">{deck.description}</p>}

      <h2 className="text-lg font-medium mt-8 mb-3">
        Cards ({deck.cards.reduce((sum, c) => sum + c.quantity, 0)})
      </h2>

      {deck.cards.length === 0 ? (
        <p className="text-gray-500 text-sm">No cards added yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {deck.cards.map((card) => (
            <li key={card.id} className="flex justify-between border-b pb-2 text-sm">
              <span>{card.card_name}</span>
              <span className="text-gray-500">×{card.quantity}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}