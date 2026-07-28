"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
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
  const { token, user } = useAuth();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Add-card form state
  const [cardName, setCardName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [category, setCategory] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  async function loadDeck() {
    try {
      const data = await apiFetch<Deck>(`/me/decks/${deckId}`, { token });
      setDeck(data);
    } catch (err) {
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

  useEffect(() => {
    loadDeck();
  }, [deckId, token]);

  async function handleAddCard(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    setIsAdding(true);

    try {
      await apiFetch(`/decks/${deckId}/cards`, {
        method: "POST",
        token,
        body: {
          card_name: cardName,
          quantity,
          category: category || null,
        },
      });
      // Clear the form and refresh the deck to show the new card
      setCardName("");
      setQuantity(1);
      setCategory("");
      await loadDeck();
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : "Failed to add card");
    } finally {
      setIsAdding(false);
    }
  }

  if (isLoading) {
    return <div className="text-center mt-16 text-gray-500">Loading...</div>;
  }

  if (error || !deck) {
    return (
      <div className="text-center mt-16 text-red-600">
        {error ?? "Deck not found"}
      </div>
    );
  }

  const isOwner = user?.id === deck.owner_id;

  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`Delete "${deck?.name}"? This can't be undone.`)) return;

    try {
      await apiFetch(`/decks/${deckId}`, { method: "DELETE", token });
      router.push("/decks/mine");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete deck");
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-16 px-4">
      <div className="flex justify-between items-start mb-2">
        <h1 className="text-2xl font-semibold">{deck.name}</h1>
        {!deck.is_public && (
          <span className="text-xs border rounded px-2 py-1">Private</span>
        )}
      </div>

      <p className="text-sm text-gray-500 mb-1">
        {deck.game}
        {deck.format && ` · ${deck.format}`}
      </p>

      {deck.description && (
        <p className="text-gray-700 mt-4">{deck.description}</p>
      )}

      <h2 className="text-lg font-medium mt-8 mb-3">
        Cards ({deck.cards.reduce((sum, c) => sum + c.quantity, 0)})
      </h2>

      {deck.cards.length === 0 ? (
        <p className="text-gray-500 text-sm">No cards added yet.</p>
      ) : (
        <ul className="flex flex-col gap-2 mb-6">
          {deck.cards.map((card) => (
            <li
              key={card.id}
              className="flex justify-between border-b pb-2 text-sm"
            >
              <span>{card.card_name}</span>
              <span className="text-gray-500">×{card.quantity}</span>
            </li>
          ))}
        </ul>
      )}

      {isOwner && (
        <>
          <form
            onSubmit={handleAddCard}
            className="flex flex-col gap-3 border-t pt-6 mt-6"
          >
            <h3 className="text-sm font-medium">Add a card</h3>
            <input
              type="text"
              placeholder="Card name"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              required
              className="border rounded px-3 py-2 text-sm"
            />
            <div className="flex gap-3">
              <input
                type="number"
                min={1}
                max={99}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
                className="border rounded px-3 py-2 text-sm w-24"
              />
              <input
                type="text"
                placeholder="Category (optional)"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="border rounded px-3 py-2 text-sm flex-1"
              />
            </div>
            {addError && <p className="text-red-600 text-sm">{addError}</p>}
            <button
              type="submit"
              disabled={isAdding}
              className="bg-black text-white rounded px-3 py-2 text-sm disabled:opacity-50 self-start"
            >
              {isAdding ? "Adding..." : "Add card"}
            </button>
          </form>
          <Link
            href={`/decks/${deckId}/edit`}
            className="text-sm underline mt-6"
          >
            Edit deck
          </Link>
          <button
            onClick={handleDelete}
            className="text-sm text-red-600 underline mt-6"
          >
            Delete deck
          </button>
        </>
      )}
    </div>
  );
}
