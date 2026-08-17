"use client";

import { useEffect } from "react";

export type FocusedCard = {
  name: string;
  imageUrl: string | null;
  game?: string;
};

type Props = {
  card: FocusedCard | null;
  onClose: () => void;
};

// Source card art comes back at wildly different native resolutions per
// game's API (Pokemon's "small" images are much lower-res than Yu-Gi-Oh's),
// so a plain max-height would leave some games tiny. Pin every card to a
// fixed target height instead, scaling small source images up, so cards
// read as a consistent size regardless of game. Yu-Gi-Oh's card frame reads
// visually "fuller" than the others at the same height, so it gets a
// slightly shorter target to keep the set feeling uniform.
const FOCUS_HEIGHT: Record<string, string> = {
  "Yu-Gi-Oh!": "64vh",
};
const DEFAULT_FOCUS_HEIGHT = "74vh";

export function CardFocusModal({ card, onClose }: Props) {
  useEffect(() => {
    if (!card) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [card, onClose]);

  if (!card) return null;

  const focusHeight = (card.game && FOCUS_HEIGHT[card.game]) ?? DEFAULT_FOCUS_HEIGHT;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 animate-fade-in-up"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-neutral-800 shadow-md hover:bg-white"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path
            fillRule="evenodd"
            d="M4.22 4.22a.75.75 0 011.06 0L10 8.94l4.72-4.72a.75.75 0 111.06 1.06L11.06 10l4.72 4.72a.75.75 0 11-1.06 1.06L10 11.06l-4.72 4.72a.75.75 0 01-1.06-1.06L8.94 10 4.22 5.28a.75.75 0 010-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <div
        className="flex flex-col items-center gap-4 max-w-[90vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {card.imageUrl ? (
          // Matted frame: a loose padded border around the art instead of
          // clipping our own corner radius straight over the card's printed
          // edge — on a tightly-cropped source image (Yu-Gi-Oh's card art
          // especially) hugging the radius directly to the art cut into the
          // card's own corners.
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-2.5 shadow-2xl shadow-black/60 max-w-[90vw] max-h-[85vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.imageUrl}
              alt={card.name}
              style={{ height: focusHeight }}
              className="max-h-[80vh] max-w-[85vw] w-auto object-contain rounded-lg"
            />
          </div>
        ) : (
          <div className="card-surface p-8 text-center text-neutral-200 text-lg">{card.name}</div>
        )}
        <p className="text-sm font-medium text-neutral-200">{card.name}</p>
      </div>
    </div>
  );
}
