import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NormalizedCard } from "@/lib/card-apis";

const searchFn = vi.fn();

vi.mock("@/lib/card-apis", () => ({
  getCardSearchFn: () => (query: string) => searchFn(query),
}));

import { CardSearch } from "./card-search";

const levi: NormalizedCard = { name: "Levi", externalId: "UE-1", imageUrl: "/levi.png" };
const erwin: NormalizedCard = { name: "Erwin Smith", externalId: "UE-2", imageUrl: "/erwin.png" };

function type(value: string) {
  fireEvent.change(screen.getByPlaceholderText("Search for a card..."), { target: { value } });
}

describe("CardSearch loading states", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    searchFn.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows placeholder tiles the moment a search starts, so the tray never goes blank", () => {
    searchFn.mockReturnValue(new Promise(() => {}));
    const { container } = render(<CardSearch game="Union Arena" onSelectCard={vi.fn()} />);

    type("levi");

    expect(screen.getByRole("status")).toHaveTextContent("Searching...");
    // A full tray of skeleton tiles, each already the shape of a card.
    const tiles = container.querySelectorAll<HTMLElement>(".tray .skeleton");
    expect(tiles).toHaveLength(12);
    expect(tiles[0].style.aspectRatio).toBe("63 / 88");
    // The tray is already laid out as the results grid, not the centered
    // "searching" message, so results replace the placeholders in place.
    const tray = container.querySelector(".tray-body")!;
    expect(tray).toHaveClass("grid", "grid-cols-4");
    expect(tray).toHaveAttribute("aria-busy", "true");
  });

  it("swaps the placeholders for results, and each result reserves its card's shape until its art loads", async () => {
    let resolve!: (cards: NormalizedCard[]) => void;
    searchFn.mockReturnValue(new Promise<NormalizedCard[]>((r) => (resolve = r)));
    const { container } = render(<CardSearch game="Union Arena" onSelectCard={vi.fn()} />);

    type("levi");
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(searchFn).toHaveBeenCalledWith("levi");
    // Still waiting on the network: placeholders stay.
    expect(container.querySelectorAll(".tray .skeleton")).toHaveLength(12);

    await act(async () => {
      resolve([levi, erwin]);
    });

    expect(screen.queryByRole("status")).toBeNull();
    const art = screen.getByAltText("Levi");
    // The picture hasn't downloaded yet, but its frame already has the final
    // shape and shows a skeleton, so the grid doesn't reflow when art arrives.
    expect(art).toHaveAttribute("data-state", "loading");
    const frames = container.querySelectorAll<HTMLElement>(".tray .card-image");
    expect(frames).toHaveLength(2);
    expect(frames[0].style.aspectRatio).toBe("63 / 88");

    fireEvent.load(art);
    expect(art).toHaveAttribute("data-state", "loaded");
  });

  it("uses Yu-Gi-Oh!'s narrower card shape for its placeholders", () => {
    searchFn.mockReturnValue(new Promise(() => {}));
    const { container } = render(<CardSearch game="Yu-Gi-Oh!" onSelectCard={vi.fn()} />);

    type("dark");

    expect(container.querySelector<HTMLElement>(".tray .skeleton")!.style.aspectRatio).toBe("59 / 86");
  });

  it("shows no placeholders until there is something to search for", () => {
    const { container } = render(<CardSearch game="Union Arena" onSelectCard={vi.fn()} />);

    type("l");

    expect(container.querySelectorAll(".tray .skeleton")).toHaveLength(0);
    expect(screen.getByText("Search for a card to add it to your deck.")).toBeInTheDocument();
  });

  it("falls back to a message, not a grid of placeholders, when the search fails", async () => {
    searchFn.mockRejectedValue(new Error("network"));
    const { container } = render(<CardSearch game="Union Arena" onSelectCard={vi.fn()} />);

    type("levi");
    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    expect(container.querySelectorAll(".tray .skeleton")).toHaveLength(0);
    expect(screen.getByText(/Couldn't reach the card database/)).toBeInTheDocument();
  });
});
