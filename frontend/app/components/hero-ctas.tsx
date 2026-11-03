"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

// The home page is static, so it can't know who is signed in. This little
// client piece swaps the calls to action once the session has loaded.
export function HeroCtas({ single = false }: { single?: boolean }) {
  const { user, isLoading } = useAuth();
  const signedIn = !isLoading && !!user;

  return (
    <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
      {signedIn ? (
        <>
          <Link href="/decks/mine" className="btn-primary px-8 py-3.5 text-base">
            Go to my decks
          </Link>
          {!single && (
            <Link href="/decks/new" className="btn-secondary px-8 py-3.5 text-base">
              Create a deck
            </Link>
          )}
        </>
      ) : (
        <>
          <Link href="/signup" className="btn-primary px-8 py-3.5 text-base">
            {single ? "Sign up free" : "Get started"}
          </Link>
          {!single && (
            <Link href="/decks" className="btn-secondary px-8 py-3.5 text-base">
              Browse decks
            </Link>
          )}
        </>
      )}
    </div>
  );
}
