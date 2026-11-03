import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// What the mocked hooks hand back. A test changes these, then renders.
type TestUser = { id: number; username: string; email: string };
let user: TestUser | null;
let isLoading: boolean;
let pathname: string;

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user, isLoading }),
}));

import { MobileTabBar } from "./mobile-tab-bar";

function signIn(username = "alice") {
  user = { id: 1, username, email: `${username}@example.com` };
}

function renderTabBar() {
  return render(<MobileTabBar />);
}

// The tab bar is the only <nav aria-label="Main">; its links are the tabs.
function tabs() {
  return within(screen.getByRole("navigation", { name: "Main" })).getAllByRole("link");
}

beforeEach(() => {
  user = null;
  isLoading = false;
  pathname = "/";
});

describe("MobileTabBar", () => {
  it("shows four tabs when signed in", () => {
    signIn();
    renderTabBar();

    expect(tabs()).toHaveLength(4);
  });

  it("shows three tabs when signed out", () => {
    renderTabBar();

    expect(tabs()).toHaveLength(3);
  });

  it('marks only the active tab with aria-current="page"', () => {
    signIn();
    pathname = "/decks/mine";
    renderTabBar();

    expect(screen.getByRole("link", { name: "My Decks" })).toHaveAttribute("aria-current", "page");
    // Every other tab must be unmarked, so a tab bar that flags all of them can't pass.
    expect(tabs().filter((tab) => tab.hasAttribute("aria-current"))).toHaveLength(1);
  });
});
