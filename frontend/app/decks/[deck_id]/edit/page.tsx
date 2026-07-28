"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api";
import { ProtectedRoute } from "@/app/components/protected-route";

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
    return <div className="text-center mt-16 text-gray-500">Loading...</div>;
  }

  if (loadError || !deck) {
    return <div className="text-center mt-16 text-red-600">{loadError ?? "Deck not found"}</div>;
  }

  // Not the owner? Bounce them back to the deck's read-only view.
  if (user?.id !== deck.owner_id) {
    router.push(`/decks/${deckId}`);
    return null;
  }

  return (
    <div className="max-w-md mx-auto mt-16 px-4">
      <h1 className="text-2xl font-semibold mb-6">Edit deck</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Deck name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="border rounded px-3 py-2"
        />

        <select
          value={game}
          onChange={(e) => setGame(e.target.value as Game)}
          className="border rounded px-3 py-2"
        >
          <option value="Yu-Gi-Oh!">Yu-Gi-Oh!</option>
          <option value="Pokemon">Pokemon</option>
          <option value="Union Arena">Union Arena</option>
        </select>

        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border rounded px-3 py-2"
          rows={3}
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          Make this deck public
        </label>

        {submitError && <p className="text-red-600 text-sm">{submitError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-black text-white rounded px-3 py-2 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Save changes"}
        </button>
      </form>
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