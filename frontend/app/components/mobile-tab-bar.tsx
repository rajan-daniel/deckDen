"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Icon, type IconName } from "./icons";

type Tab = { href: string; label: string; icon: IconName; active: boolean };

// A thumb-reach bar for phones. The top nav hides its links below the md
// breakpoint, so this is how small screens get around.
export function MobileTabBar() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();

  if (isLoading) return null;

  const profileHref = user ? `/users/${encodeURIComponent(user.username)}` : "";

  const tabs: Tab[] = user
    ? [
        { href: "/decks", label: "Browse", icon: "globe", active: pathname === "/decks" || pathname.startsWith("/decks/browse") },
        { href: "/decks/mine", label: "My Decks", icon: "cards", active: pathname.startsWith("/decks/mine") },
        { href: profileHref, label: "My Profile", icon: "user", active: pathname === profileHref },
        { href: "/account", label: "Account", icon: "key", active: pathname.startsWith("/account") },
      ]
    : [
        { href: "/decks", label: "Browse", icon: "globe", active: pathname === "/decks" || pathname.startsWith("/decks/browse") },
        { href: "/login", label: "Log in", icon: "user", active: pathname === "/login" },
        { href: "/signup", label: "Sign up", icon: "plus", active: pathname === "/signup" },
      ];

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-800 bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className={`mx-auto grid max-w-md ${user ? "grid-cols-4" : "grid-cols-3"}`}>
        {tabs.map((tab) => (
          <li key={tab.label}>
            <Link
              href={tab.href}
              aria-current={tab.active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${
                tab.active ? "text-brand-hi" : "text-neutral-400 hover:text-white"
              }`}
            >
              <Icon name={tab.icon} className="h-5 w-5" />
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
