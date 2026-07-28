import { GAMES } from "@/lib/games";
import { GameCard } from "@/app/components/game-card";

export default function BrowseGamePickerPage() {
  return (
    <div className="w-full max-w-2xl mx-auto mt-16 px-4">
      <h1 className="text-2xl font-semibold mb-2">Browse Decks</h1>
      <p className="text-neutral-400 text-sm mb-8">Which game?</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {GAMES.map((game) => (
          <GameCard key={game.slug} game={game} href={`/decks/browse/${game.slug}`} />
        ))}
      </div>
    </div>
  );
}
