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
    <nav className="border-b px-6 py-4 flex justify-between items-center gap-4">
      <Link href="/" className="font-semibold text-lg">
        DeckDen
      </Link>

      <div className="relative flex-1 max-w-xs">
        <input
          type="text"
          placeholder="Find a player..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm w-full"
        />

        {results.length > 0 && (
          <ul className="absolute z-10 bg-white border rounded mt-1 w-full shadow-md">
            {results.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => goToProfile(u.username)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                >
                  {u.username}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-4 items-center">
        <Link href="/decks" className="text-sm underline">
          Browse Decks
        </Link>
        {isLoading ? null : user ? (
          <>
            <Link href="/decks/mine" className="text-sm underline">
              My Decks
            </Link>
            <span className="text-sm text-gray-600">Hi, {user.username}</span>
            <button onClick={logout} className="text-sm underline">
              Log out
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-sm underline">
              Log in
            </Link>
            <Link href="/signup" className="text-sm underline">
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}