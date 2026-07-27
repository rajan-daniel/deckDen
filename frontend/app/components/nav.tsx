"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function Nav() {
  const { user, isLoading, logout } = useAuth();

  return (
    <nav className="border-b px-6 py-4 flex justify-between items-center">
      <Link href="/" className="font-semibold text-lg">
        DeckDen
      </Link>

      <div className="flex gap-4 items-center">
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
