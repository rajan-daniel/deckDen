import Link from "next/link";
import { GAME_ACCENT, GAME_LOGO } from "@/lib/games";
import { itemIndex } from "@/lib/motion";
import { CardStackIcon } from "@/app/components/empty-state";
import { CardImage } from "@/app/components/card-image";

export type DeckSummary = {
  id: number;
  name: string;
  game: string;
  format: string | null;
  play_style: string | null;
  owner_username: string;
  preview_image_url: string | null;
  card_count: number;
  is_public: boolean;
};

type Props = {
  deck: DeckSummary;
  /** Position in the grid. Staggers the entrance so tiles settle in one after another. */
  index?: number;
};

export function DeckCard({ deck, index = 0 }: Props) {
  // Shown for decks with no cards yet, and if the preview picture fails to load.
  const fallback = (
    <div
      className={`flex h-full w-full items-center justify-center ${GAME_ACCENT[deck.game] ?? "bg-gradient-to-br from-neutral-800 to-neutral-900"}`}
    >
      {GAME_LOGO[deck.game] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={GAME_LOGO[deck.game]}
          alt=""
          className="h-14 w-14 object-contain opacity-50"
        />
      ) : (
        <CardStackIcon className="h-10 w-10 text-white/40" />
      )}
    </div>
  );

  return (
    <Link
      href={`/decks/${deck.id}`}
      className="deck-card tile-in group"
      style={itemIndex(index)}
    >
      <CardImage
        src={deck.preview_image_url}
        alt=""
        aspect="3 / 4"
        className="deck-card-art"
        imgClassName="deck-card-art-img"
        fallback={fallback}
        fallbackClassName="p-0 bg-transparent"
      >
        <div className="deck-card-scrim" />
        {(deck.format || deck.play_style) && (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
            {deck.format && <span className="deck-card-chip static">{deck.format}</span>}
            {deck.play_style && <span className="deck-card-chip static">{deck.play_style}</span>}
          </div>
        )}
        <span className="deck-card-chip top-2 right-2">
          {deck.card_count} {deck.card_count === 1 ? "card" : "cards"}
        </span>
        {!deck.is_public && (
          <span className="deck-card-chip bottom-2 left-2">Private</span>
        )}
      </CardImage>

      <div className="deck-card-body">
        <p className="font-semibold text-neutral-100 group-hover:text-brand-hi transition-colors line-clamp-2 min-h-[2.5rem]">
          {deck.name}
        </p>
        <div className="deck-card-owner">
          <span className="deck-avatar">{deck.owner_username.slice(0, 1).toUpperCase()}</span>
          <span className="text-xs text-neutral-400 truncate">{deck.owner_username}</span>
        </div>
      </div>
    </Link>
  );
}
