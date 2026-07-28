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

  const [addError, setAddError] = useState<string | null>(null);
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
        await apiFetch(`/decks/${deckId}/cards/${card.id}`, {
          method: "DELETE",
          token,
        });
      } else {
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
    <div className="max-w-5xl mx-auto mt-16 px-4">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        {/* LEFT: search + results grid (owner only) */}
        {isOwner && (
          <div>
            <h2 className="text-lg font-medium mb-3">Add cards</h2>
            <CardSearch game={deck.game} onSelectCard={handleSelectCard} />
            {addError && <p className="text-red-600 text-sm mt-2">{addError}</p>}
          </div>
        )}

        {/* RIGHT: current deck as an image grid */}
        <div>
          <h2 className="text-lg font-medium mb-3">
            Deck ({deck.cards.reduce((sum, c) => sum + c.quantity, 0)})
          </h2>

          {deck.cards.length === 0 ? (
            <p className="text-gray-500 text-sm">No cards added yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {deck.cards.flatMap((card) =>
                Array.from({ length: card.quantity }).map((_, i) => (
                  <div key={`${card.id}-${i}`} className="relative group">
                    {card.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={card.image_url}
                        alt={card.card_name}
                        className="w-full h-auto rounded border"
                      />
                    ) : (
                      <div className="border rounded p-2 text-xs">
                        {card.card_name}
                      </div>
                    )}
                    {isOwner && (
                      <button
                        onClick={() => handleRemoveOneCopy(card)}
                        className="absolute inset-0 bg-black/60 text-white text-xs opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )),
              )}
            </div>
          )}

          {cardActionError && (
            <p className="text-red-600 text-sm mt-2">{cardActionError}</p>
          )}
        </div>
      </div>

      {isOwner && (
        <div className="flex gap-4 mt-8 border-t pt-6">
          <Link href={`/decks/${deckId}/edit`} className="text-sm underline">
            Edit deck
          </Link>
          <button
            onClick={handleDelete}
            className="text-sm text-red-600 underline"
          >
            Delete deck
          </button>
        </div>
      )}
    </div>
  );
}