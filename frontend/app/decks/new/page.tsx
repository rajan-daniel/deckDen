"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api";
import { ProtectedRoute } from "@/app/components/protected-route";

type Game = "Union Arena" | "Yu-Gi-Oh!" | "Pokemon";

function NewDeckForm() {
  const { token } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [game, setGame] = useState<Game>("Yu-Gi-Oh!");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const deck = await apiFetch<{ id: number }>("/decks", {
        method: "POST",
        token,
        body: { name, game, description, is_public: isPublic },
      });
      router.push(`/decks/${deck.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-16 px-4">
      <h1 className="text-2xl font-semibold mb-6">Create a deck</h1>
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

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-black text-white rounded px-3 py-2 disabled:opacity-50"
        >
          {isSubmitting ? "Creating..." : "Create deck"}
        </button>
      </form>
    </div>
  );
}

export default function NewDeckPage() {
  return (
    <ProtectedRoute>
      <NewDeckForm />
    </ProtectedRoute>
  );
}