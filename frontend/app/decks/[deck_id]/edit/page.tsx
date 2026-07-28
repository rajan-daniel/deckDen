"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api";
import { ProtectedRoute } from "@/app/components/protected-route";
import { Loading } from "@/app/components/loading";

type Game = "Union Arena" | "Yu-Gi-Oh!" | "Pokemon";

type Deck = {
  id: number;
  name: string;
  game: Game;
  format: string | null;
  description: string | null;
  is_public: boolean;
  owner_id: number;
};

function EditDeckForm() {
  const params = useParams();
  const deckId = params.deck_id;
  const { token, user } = useAuth();
  const router = useRouter();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [name, setName] = useState("");
  const [game, setGame] = useState<Game>("Yu-Gi-Oh!");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadDeck() {
      try {
        const data = await apiFetch<Deck>(`/me/decks/${deckId}`, { token });
        setDeck(data);
        setName(data.name);
        setGame(data.game);
        setDescription(data.description ?? "");
        setIsPublic(data.is_public);
      } catch (err) {
        setLoadError(err instanceof ApiError ? err.message : "Deck not found");
      } finally {
        setIsLoading(false);
      }
    }
    loadDeck();
  }, [deckId, token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await apiFetch(`/decks/${deckId}`, {
        method: "PUT",
        token,
        body: { name, game, description, is_public: isPublic },
      });
      router.push(`/decks/${deckId}`);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Failed to update deck");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <Loading />;
  }

  if (loadError || !deck) {
    return <div className="text-center mt-16 text-red-400">{loadError ?? "Deck not found"}</div>;
  }

  // Not the owner? Bounce them back to the deck's read-only view.
  if (user?.id !== deck.owner_id) {
    router.push(`/decks/${deckId}`);
    return null;
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md card-surface p-8">
        <h1 className="text-2xl font-semibold mb-6">Edit deck</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Deck name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="input-field"
          />

          <select
            value={game}
            onChange={(e) => setGame(e.target.value as Game)}
            className="input-field"
          >
            <option value="Yu-Gi-Oh!">Yu-Gi-Oh!</option>
            <option value="Pokemon">Pokemon</option>
            <option value="Union Arena">Union Arena</option>
          </select>

          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field"
            rows={3}
          />

          <label className="flex items-center gap-2 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-600 bg-neutral-900 text-sky-500 focus:ring-sky-400"
            />
            Make this deck public
          </label>

          {submitError && <p className="text-red-400 text-sm">{submitError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary py-2.5 mt-1"
          >
            {isSubmitting ? "Saving..." : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function EditDeckPage() {
  return (
    <ProtectedRoute>
      <EditDeckForm />
    </ProtectedRoute>
  );
}