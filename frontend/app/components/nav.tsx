"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { GAMES } from "@/lib/games";
import { Icon } from "./icons";

type UserResult = {
  id: number;
  username: string;
};

const linkBase =
  "relative px-1 py-1.5 text-sm font-semibold transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:transition-colors";

function navLinkClass(active: boolean) {
  return `${linkBase} ${
    active
      ? "text-white after:bg-brand"
      : "text-neutral-300 hover:text-white after:bg-transparent"
  }`;
}

export function Nav() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);

  // The bar starts light and settles into a solid, shadowed one once the page
  // scrolls. A data attribute (not state) so scrolling never re-renders the nav.
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      el.dataset.scrolled = window.scrollY > 8 ? "true" : "false";
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const found = await apiFetch<UserResult[]>(
          `/users/search?q=${encodeURIComponent(query)}`
        );
        setResults(found);
      } catch {
        setResults([]);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  function goToProfile(username: string) {
    router.push(`/users/${encodeURIComponent(username)}`);
    setQuery("");
    setResults([]);
  }

  const browseActive = pathname === "/decks" || pathname.startsWith("/decks/browse");
  const myDecksActive = pathname.startsWith("/decks/mine");
  const profileHref = user ? `/users/${encodeURIComponent(user.username)}` : "";
  const profileActive = !!user && pathname === profileHref;

  return (
    <nav
      ref={navRef}
      data-scrolled="false"
      className="sticky top-0 z-40 border-b border-neutral-800/60 bg-ink/70 backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-300 data-[scrolled=true]:border-neutral-800 data-[scrolled=true]:bg-ink/95 data-[scrolled=true]:shadow-lg data-[scrolled=true]:shadow-black/40"
    >
      <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-3.5 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" className="h-8 w-8" />
          <span className="font-display-xl text-[1.05rem] uppercase tracking-[0.08em] text-white">
            DeckDen
          </span>
        </Link>

        <div className="ml-4 hidden items-center gap-6 md:flex">
          <Link href="/decks" className={navLinkClass(browseActive)}>
            Browse Decks
          </Link>

          <div className="group relative">
            <button
              type="button"
              aria-haspopup="menu"
              className={`${navLinkClass(false)} inline-flex items-center gap-1`}
            >
              Games
              <Icon name="chevron" className="h-4 w-4" />
            </button>
            <ul
              role="menu"
              className="invisible absolute left-0 top-full z-50 mt-1 w-48 translate-y-1 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 p-1 opacity-0 shadow-xl shadow-black/60 transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100"
            >
              {GAMES.map((game) => (
                <li key={game.slug} role="none">
                  <Link
                    role="menuitem"
                    href={`/decks/browse/${game.slug}`}
                    className="block rounded-lg px-3 py-2 text-sm text-neutral-200 transition-colors hover:bg-brand/15 hover:text-white"
                  >
                    {game.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <Link href="/about" className={navLinkClass(pathname === "/about")}>
            About
          </Link>
        </div>

        <div className="relative ml-auto w-full max-w-[14rem] flex-1 md:max-w-xs">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="text"
            aria-label="Find a player"
            placeholder="Find a player..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input-field rounded-full border-neutral-800 bg-neutral-900/80 py-1.5 pl-10"
          />

          {results.length > 0 && (
            <ul className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900 shadow-lg shadow-black/50">
              {results.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => goToProfile(u.username)}
                    className="w-full px-3.5 py-2 text-left text-sm text-neutral-200 transition-colors hover:bg-brand/15"
                  >
                    {u.username}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="hidden items-center gap-1 md:flex">
          {isLoading ? null : user ? (
            <>
              <Link href="/decks/mine" className={`${navLinkClass(myDecksActive)} mx-2`}>
                My Decks
              </Link>
              <Link href={profileHref} className={`${navLinkClass(profileActive)} mx-2`}>
                My Profile
              </Link>
              <Link
                href="/account"
                className="ml-2 flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 py-1 pl-1 pr-3.5 text-sm font-semibold text-white transition-colors hover:border-brand/60"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                  {user.username.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-[8rem] truncate lg:inline">{user.username}</span>
              </Link>
              <button onClick={logout} className="btn-ghost">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-outline-brand">
                Log in
              </Link>
              <Link href="/signup" className="btn-primary ml-1">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
