import Link from "next/link";
import { GAMES } from "@/lib/games";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-neutral-800/70 bg-neutral-950/60">
      <div className="w-full max-w-5xl mx-auto px-6 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8">
        <div className="col-span-2 sm:col-span-1">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg w-fit">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-purple-600 text-white text-xs shadow-sm shadow-purple-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#F3F3F3"><path d="M80-80v-186l350-472-70-94 64-48 56 75 56-75 64 48-70 94 350 472v186H80Zm400-591L160-240v80h120l200-280 200 280h120v-80L480-671ZM378-160h204L480-302 378-160Zm102-280 200 280-200-280-200 280 200-280Z"/></svg>
            </span>
            <span className="gradient-text">DeckDen</span>
          </Link>
          <p className="text-sm text-neutral-500 mt-3 leading-relaxed max-w-[22ch]">
            Build, browse, and share TCG decklists in one clean, fast place.
          </p>
        </div>

        <div>
          <p className="footer-heading">Navigate</p>
          <ul className="flex flex-col gap-2.5">
            <li><Link href="/" className="footer-link">Home</Link></li>
            <li><Link href="/decks" className="footer-link">Browse Decks</Link></li>
            <li><Link href="/decks/new" className="footer-link">Create a Deck</Link></li>
            <li><Link href="/decks/mine" className="footer-link">My Decks</Link></li>
          </ul>
        </div>

        <div>
          <p className="footer-heading">Games</p>
          <ul className="flex flex-col gap-2.5">
            {GAMES.map((game) => (
              <li key={game.slug}>
                <Link href={`/decks/browse/${game.slug}`} className="footer-link">
                  {game.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="footer-heading">Company</p>
          <ul className="flex flex-col gap-2.5">
            <li><Link href="/about" className="footer-link">About</Link></li>
            <li><Link href="/contact" className="footer-link">Contact</Link></li>
            <li><Link href="/privacy" className="footer-link">Privacy Policy</Link></li>
            <li><Link href="/terms" className="footer-link">Terms of Service</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-neutral-800/70">
        <div className="w-full max-w-5xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-600">
          <p>&copy; {year} DeckDen. All card names and artwork belong to their respective publishers.</p>
        </div>
      </div>
    </footer>
  );
}
