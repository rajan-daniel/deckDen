import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// What the mocked hooks hand back. A test changes these, then renders.
type TestUser = { id: number; username: string; email: string };
let user: TestUser | null;
let isLoading: boolean;
let pathname: string;

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user, isLoading, logout: vi.fn() }),
}));

import { Nav } from "./nav";

function signIn(username = "alice") {
  user = { id: 1, username, email: `${username}@example.com` };
}

function renderNav() {
  return render(<Nav />);
}

beforeEach(() => {
  user = null;
  isLoading = false;
  pathname = "/";
});

describe("Nav", () => {
  describe("My Profile link", () => {
    it("a signed-in player sees it next to My Decks, linking to /users/<username>", () => {
      signIn("alice");
      renderNav();

      const myDecks = screen.getByRole("link", { name: "My Decks" });
      const myProfile = screen.getByRole("link", { name: "My Profile" });

      expect(myDecks.nextElementSibling).toBe(myProfile);
      expect(myProfile).toHaveAttribute("href", "/users/alice");
    });

    it("a signed-out visitor doesn't see it", () => {
      renderNav();

      // The nav did render (its Log in link is there), so an empty page can't pass this.
      expect(screen.getByRole("link", { name: "Log in" })).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "My Profile" })).toBeNull();
    });

    it("a username with special characters is encoded in the link", () => {
      // encodeURI leaves "/" and "?" alone, so these also catch the wrong encoder, not just a missing one.
      signIn("a b/c?");
      renderNav();

      expect(screen.getByRole("link", { name: "My Profile" })).toHaveAttribute(
        "href",
        "/users/a%20b%2Fc%3F",
      );
    });
  });
});
