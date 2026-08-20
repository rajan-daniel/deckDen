import Link from "next/link";
import { GAMES } from "@/lib/games";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-neutral-800/70 bg-neutral-950/60">
      <div className="w-full max-w-5xl mx-auto px-6 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8">
        <div className="col-span-2 sm:col-span-1">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" className="h-7 w-7" />
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
          <p>&copy; {year} DeckDen. All card names and artwork belong to game publishers. ©2020 Studio Dice/SHUEISHA, TV TOKYO, KONAMI
©Konami Digital Entertainment © Pokémon. © 1995–2026 Nintendo/Creatures Inc./GAME FREAK inc.
TM, ® Nintendo, Creatures, GAME FREAK. ©BANDAI</p>
        </div>
      </div>
    </footer>
  );
}
