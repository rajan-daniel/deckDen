"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api";
import { CardSearch, DeckSection } from "@/app/components/card-search";
import { GAME_ACCENT } from "@/lib/games";
import { Loading } from "@/app/components/loading";
import { EmptyState, CardStackIcon, ZoomIcon } from "@/app/components/empty-state";
import { CardFocusModal, FocusedCard } from "@/app/components/card-focus-modal";

const EXTRA_DECK_CATEGORY = "Extra Deck";
const MAIN_DECK_CATEGORY = "Main Deck";

type DeckCard = {
  id: number;
  card_name: string;
  external_card_id: string | null;
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
  const [focusedCard, setFocusedCard] = useState<FocusedCard | null>(null);

  // Auth token resolves asynchronously from localStorage on mount, so this
  // can fire once with token=null (401 -> falls back to the public route,
  // which 404s for a private deck) and again once the token lands. Track
  // which call is newest so a slower, stale attempt can't overwrite a
  // faster, correct one's state after the fact.
  const requestIdRef = useRef(0);

  async function loadDeck() {
    const requestId = ++requestIdRef.current;
    try {
      const data = await apiFetch<Deck>(`/me/decks/${deckId}`, { token });
      if (requestIdRef.current === requestId) setDeck(data);
    } catch (err) {
      try {
        const data = await apiFetch<Deck>(`/decks/${deckId}`);
        if (requestIdRef.current === requestId) setDeck(data);
      } catch (err2) {
        if (requestIdRef.current === requestId) {
          setError(err2 instanceof ApiError ? err2.message : "Deck not found");
        }
      }
    } finally {
      if (requestIdRef.current === requestId) setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDeck();
  }, [deckId, token]);

  const isYugioh = deck?.game === "Yu-Gi-Oh!";

  async function handleSelectCard(
    card: { name: string; externalId: string; imageUrl: string },
    section?: DeckSection,
  ) {
    setAddError(null);

    const category = isYugioh
      ? section === "extra"
        ? EXTRA_DECK_CATEGORY
        : MAIN_DECK_CATEGORY
      : null;

    const existing = deck?.cards.find((c) =>
      (card.externalId
        ? c.external_card_id === card.externalId
        : c.card_name === card.name) && c.category === category,
    );

    try {
      if (existing) {
        await apiFetch(`/decks/${deckId}/cards/${existing.id}`, {
          method: "PUT",
          token,
          body: { quantity: existing.quantity + 1 },
        });
      } else {
        await apiFetch(`/decks/${deckId}/cards`, {
          method: "POST",
          token,
          body: {
            card_name: card.name,
            external_card_id: card.externalId,
            image_url: card.imageUrl,
            quantity: 1,
            category,
          },
        });
      }
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
    return <Loading />;
  }

  if (error || !deck) {
    return (
      <div className="text-center mt-16 text-red-400">
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

  const cardCount = deck.cards.reduce((sum, c) => sum + c.quantity, 0);
  const accent = GAME_ACCENT[deck.game] ?? "bg-gradient-to-r from-sky-500 to-purple-600";
  const currentGame = deck.game;

  function renderCardTile(card: DeckCard) {
    return (
      <div key={card.id} className="grid-card group">
        <div className="grid-card-frame">
          {card.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.image_url} alt={card.card_name} className="grid-card-img" />
          ) : (
            <div className="p-2 text-xs min-h-24 flex items-center text-neutral-300">
              {card.card_name}
            </div>
          )}
          {isOwner && (
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-black/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          )}
          <button
            type="button"
            onClick={() =>
              setFocusedCard({ name: card.card_name, imageUrl: card.image_url, game: currentGame })
            }
            aria-label={`Enlarge ${card.card_name}`}
            className="zoom-btn"
          >
            <ZoomIcon className="h-3.5 w-3.5" />
          </button>
        </div>

        {card.quantity > 1 && <span className="qty-badge">×{card.quantity}</span>}

        {isOwner && (
          <button
            onClick={() => handleRemoveOneCopy(card)}
            aria-label={`Remove one copy of ${card.card_name}`}
            className="absolute top-1.5 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-red-600 shadow-md opacity-0 scale-90 transition-all duration-200 hover:bg-red-600 hover:text-white group-hover:opacity-100 group-hover:scale-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-3.5 w-3.5"
            >
              <path
                fillRule="evenodd"
                d="M4.22 4.22a.75.75 0 011.06 0L10 8.94l4.72-4.72a.75.75 0 111.06 1.06L11.06 10l4.72 4.72a.75.75 0 11-1.06 1.06L10 11.06l-4.72 4.72a.75.75 0 01-1.06-1.06L8.94 10 4.22 5.28a.75.75 0 010-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    );
  }

  function renderSection(title: string, cards: DeckCard[], size: "default" | "sm") {
    const count = cards.reduce((sum, c) => sum + c.quantity, 0);
    const hasCards = cards.length > 0;
    const bodyClass = size === "sm" ? "tray-body-sm" : "tray-body";
    return (
      <div>
        <h3 className="text-sm font-medium text-neutral-400 mb-2">
          {title} <span className="text-neutral-500 font-normal">({count})</span>
        </h3>
        <div className="tray">
          <div
            className={
              hasCards
                ? `${bodyClass} grid grid-cols-4 gap-3 items-start content-start`
                : `${bodyClass} flex items-center justify-center`
            }
          >
            {hasCards ? (
              cards.map(renderCardTile)
            ) : (
              <EmptyState title={`No ${title.toLowerCase()} cards yet.`} />
            )}
          </div>
        </div>
      </div>
    );
  }

  const mainDeckCards = deck.cards.filter((c) => c.category !== EXTRA_DECK_CATEGORY);
  const extraDeckCards = deck.cards.filter((c) => c.category === EXTRA_DECK_CATEGORY);

  return (
    <div className="w-full max-w-7xl mx-auto mt-12 px-4 pb-16">
      <div className="card-surface relative overflow-hidden p-6 mb-8">
        <span className={`absolute top-0 left-0 right-0 h-1.5 ${accent}`} />

        <div className="flex justify-between items-start gap-4">
          <h1 className="text-2xl font-semibold">{deck.name}</h1>
          {!deck.is_public && <span className="badge shrink-0">Private</span>}
        </div>

        <div className="flex items-center gap-2 mt-2">
          <span className="badge-accent">{deck.game}</span>
          {deck.format && <span className="badge">{deck.format}</span>}
        </div>

        {deck.description && (
          <p className="text-neutral-300 mt-4">{deck.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* LEFT: search + results grid (owner only) */}
        {isOwner && (
          <div>
            <h2 className="text-lg font-medium mb-3">Add cards</h2>
            <CardSearch game={deck.game} onSelectCard={handleSelectCard} />
            {addError && <p className="text-red-400 text-sm mt-2">{addError}</p>}
          </div>
        )}

        {/* RIGHT: current deck as an image grid */}
        <div>
          <h2 className="text-lg font-medium mb-3">
            Deck{" "}
            <span className="text-neutral-400 font-normal">({cardCount})</span>
          </h2>
          {/* Matches the search bar's footprint on the left so both trays start at the same y-position */}
          {isOwner && <div className="search-row" aria-hidden="true" />}

          {isYugioh ? (
            <div className="flex flex-col gap-6">
              {renderSection("Main Deck", mainDeckCards, "default")}
              {renderSection("Extra Deck", extraDeckCards, "sm")}
            </div>
          ) : (
            <div className="tray">
              <div
                className={
                  deck.cards.length === 0
                    ? "tray-body flex items-center justify-center"
                    : "tray-body grid grid-cols-4 gap-3 items-start content-start"
                }
              >
                {deck.cards.length === 0 ? (
                  <EmptyState
                    title="No cards added yet."
                    icon={<CardStackIcon className="h-7 w-7 text-neutral-600" />}
                  />
                ) : (
                  deck.cards.map(renderCardTile)
                )}
              </div>
            </div>
          )}

          {cardActionError && (
            <p className="text-red-400 text-sm mt-2">{cardActionError}</p>
          )}
        </div>
      </div>

      {isOwner && (
        <div className="flex gap-3 mt-8 border-t border-neutral-800 pt-6">
          <Link href={`/decks/${deckId}/edit`} className="btn-secondary py-2 px-4">
            Edit deck
          </Link>
          <button onClick={handleDelete} className="btn-danger">
            Delete deck
          </button>
        </div>
      )}

      <CardFocusModal card={focusedCard} onClose={() => setFocusedCard(null)} />
    </div>
  );
}
