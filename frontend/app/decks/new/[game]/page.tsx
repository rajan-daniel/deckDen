"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api";
import { ProtectedRoute } from "@/app/components/protected-route";
import { SLUG_TO_GAME } from "@/lib/games";
import { PLAY_STYLES } from "@/lib/deck-options";

function NewDeckForm() {
  const params = useParams();
  const slug = params.game as string;
  const gameName = SLUG_TO_GAME[slug];

  const { token } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [playStyle, setPlayStyle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Invalid slug (someone typed a bad URL directly) — bail out early
  if (!gameName) {
    return (
      <div className="text-center mt-16 text-red-400">
        Unknown game. Go back and pick again.
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const deck = await apiFetch<{ id: number }>("/decks", {
        method: "POST",
        token,
        body: {
          name,
          game: gameName,
          play_style: playStyle || null,
          description,
          is_public: isPublic,
        },
      });
      router.push(`/decks/${deck.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md card-surface p-8">
        <h1 className="text-2xl font-semibold mb-1">New {gameName} deck</h1>
        <p className="text-neutral-400 text-sm mb-6">
          Fill in the details to get started.
        </p>

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
            value={playStyle}
            onChange={(e) => setPlayStyle(e.target.value)}
            className="input-field"
          >
            <option value="">Play style (optional)</option>
            {PLAY_STYLES.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
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

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary py-2.5 mt-1"
          >
            {isSubmitting ? "Creating..." : "Create deck"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function NewDeckFormPage() {
  return (
    <ProtectedRoute>
      <NewDeckForm />
    </ProtectedRoute>
  );
}