import Link from "next/link";
import { GAMES } from "@/lib/games";

export default function BrowseGamePickerPage() {
  return (
    <div className="max-w-2xl mx-auto mt-16 px-4">
      <h1 className="text-2xl font-semibold mb-2">Browse Decks</h1>
      <p className="text-gray-500 text-sm mb-8">Which game?</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {GAMES.map((game) => (
          <Link
            key={game.slug}
            href={`/decks/browse/${game.slug}`}
            className={`${game.color} text-white rounded-lg px-6 py-10 text-center font-medium hover:opacity-90 transition`}
          >
            {game.name}
          </Link>
        ))}
      </div>
    </div>
  );
}