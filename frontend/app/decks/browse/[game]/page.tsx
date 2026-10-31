"use client";

import { useParams } from "next/navigation";
import { SLUG_TO_GAME } from "@/lib/games";
import { BrowseDecks } from "@/app/components/browse-decks";

export default function BrowseByGamePage() {
  const params = useParams();
  const slug = params.game as string;
  const gameName = SLUG_TO_GAME[slug];

  if (!gameName) {
    return (
      <div className="mt-16 text-center text-red-400">
        Unknown game. Go back and pick again.
      </div>
    );
  }

  return <BrowseDecks gameName={gameName} />;
}
