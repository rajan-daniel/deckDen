import Link from "next/link";
import { GAMES } from "@/lib/games";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-800/80 bg-ink">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-10 px-6 py-14 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div className="col-span-2 lg:col-span-1">
          <Link href="/" className="flex w-fit items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" className="h-8 w-8" />
            <span className="font-display-xl text-[1.05rem] uppercase tracking-[0.08em] text-white">
              DeckDen
            </span>
          </Link>
          <p className="mt-4 max-w-[26ch] text-sm leading-relaxed text-neutral-500">
            One account, one public profile, every deck you build across every game you play.
          </p>
        </div>

        <div>
          <p className="footer-heading">01_Navigate</p>
          <ul className="flex flex-col gap-3">
            <li><Link href="/" className="footer-link">Home</Link></li>
            <li><Link href="/decks" className="footer-link">Browse Decks</Link></li>
            <li><Link href="/decks/new" className="footer-link">Create a Deck</Link></li>
            <li><Link href="/decks/mine" className="footer-link">My Decks</Link></li>
          </ul>
        </div>

        <div>
          <p className="footer-heading">02_Games</p>
          <ul className="flex flex-col gap-3">
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
          <p className="footer-heading">03_Account</p>
          <ul className="flex flex-col gap-3">
            <li><Link href="/login" className="footer-link">Log in</Link></li>
            <li><Link href="/signup" className="footer-link">Sign up</Link></li>
            <li><Link href="/account" className="footer-link">Account &amp; AI assistants</Link></li>
          </ul>
        </div>

        <div>
          <p className="footer-heading">04_Company</p>
          <ul className="flex flex-col gap-3">
            <li><Link href="/about" className="footer-link">About</Link></li>
            <li><Link href="/contact" className="footer-link">Contact</Link></li>
            <li><Link href="/privacy" className="footer-link">Privacy Policy</Link></li>
            <li><Link href="/terms" className="footer-link">Terms of Service</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-neutral-800/80">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-3 px-6 py-6 text-xs text-neutral-500 sm:flex-row">
          <p className="max-w-4xl leading-relaxed">&copy; {year} DeckDen. All card names and artwork belong to game publishers. ©2020 Studio Dice/SHUEISHA, TV TOKYO, KONAMI
©Konami Digital Entertainment © Pokémon. © 1995–2026 Nintendo/Creatures Inc./GAME FREAK inc.
TM, ® Nintendo, Creatures, GAME FREAK. ©BANDAI</p>
          <p className="mono-tag shrink-0 opacity-70">010101_01</p>
        </div>
      </div>
    </footer>
  );
}
