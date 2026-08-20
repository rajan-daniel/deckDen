"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";

type UserResult = {
  id: number;
  username: string;
};

export function Nav() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);

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

  return (
    <nav className="sticky top-0 z-40 border-b border-neutral-800/70 bg-neutral-950/75 backdrop-blur-md px-6 py-3.5 flex justify-between items-center gap-4">
      <Link
        href="/"
        className="flex items-center gap-2 font-semibold text-lg shrink-0"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="" className="h-7 w-7" />
        <span className="gradient-text">DeckDen</span>
      </Link>

      <div className="relative flex-1 max-w-xs">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
            clipRule="evenodd"
          />
        </svg>
        <input
          type="text"
          placeholder="Find a player..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input-field pl-9 py-1.5 rounded-full"
        />

        {results.length > 0 && (
          <ul className="absolute z-10 bg-neutral-900 border border-neutral-700 rounded-xl mt-1.5 w-full shadow-lg shadow-black/50 overflow-hidden">
            {results.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => goToProfile(u.username)}
                  className="w-full text-left px-3.5 py-2 text-sm text-neutral-200 hover:bg-sky-500/10 transition-colors"
                >
                  {u.username}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-1 items-center">
        <Link href="/decks" className="btn-ghost">
          Browse Decks
        </Link>
        {isLoading ? null : user ? (
          <>
            <Link href="/decks/mine" className="btn-ghost">
              My Decks
            </Link>
            <Link
              href="/account"
              className="hidden sm:inline text-sm text-neutral-400 px-2 hover:text-sky-400 transition-colors"
            >
              Hi, {user.username}
            </Link>
            <button onClick={logout} className="btn-ghost">
              Log out
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="btn-ghost">
              Log in
            </Link>
            <Link href="/signup" className="btn-primary py-2 px-4">
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}