"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api";
import { CardSearch } from "@/app/components/card-search";

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
  const router = useRouter();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Add-card form state
  const [addError, setAddError] = useState<string | null>(null);

  // Edit-card state
  const [cardActionError, setCardActionError] = useState<string | null>(null);

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

  async function handleSelectCard(card: {
    name: string;
    externalId: string;
    imageUrl: string;
  }) {
    setAddError(null);
    try {
      await apiFetch(`/decks/${deckId}/cards`, {
        method: "POST",
        token,
        body: {
          card_name: card.name,
          external_card_id: card.externalId,
          image_url: card.imageUrl,
          quantity: 1,
        },
      });
      await loadDeck();
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : "Failed to add card");
    }
  }

  async function handleRemoveOneCopy(card: DeckCard) {
    try {
      if (card.quantity <= 1) {
        // Last copy — remove the row entirely
        await apiFetch(`/decks/${deckId}/cards/${card.id}`, {
          method: "DELETE",
          token,
        });
      } else {
        // Still copies left — just decrement
        await apiFetch(`/decks/${deckId}/cards/${card.id}`, {
          method: "PUT",
          token,
          body: { quantity: card.quantity - 1 },
        });
      }
      await loadDeck();
    } catch (err) {
      setCardActionError(
        err instanceof ApiError ? err.message : "Failed to remove card",
      );
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
        <ul className="grid grid-cols-2 gap-2 mb-2">
          {deck.cards.flatMap((card) =>
            Array.from({ length: card.quantity }).map((_, i) => (
              <li
                key={`${card.id}-${i}`}
                className="flex justify-between items-center border rounded px-3 py-2 text-sm"
              >
                <span>{card.card_name}</span>
                {isOwner && (
                  <button
                    onClick={() => handleRemoveOneCopy(card)}
                    className="text-xs text-red-600 underline"
                  >
                    Remove
                  </button>
                )}
              </li>
            )),
          )}
        </ul>
      )}
      {cardActionError && (
        <p className="text-red-600 text-sm mb-4">{cardActionError}</p>
      )}

      {isOwner && (
        <>
          <div className="border-t pt-6 mt-6">
            <h3 className="text-sm font-medium mb-3">Add a card</h3>
            <CardSearch game={deck.game} onSelectCard={handleSelectCard} />
            {addError && (
              <p className="text-red-600 text-sm mt-2">{addError}</p>
            )}
          </div>
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
