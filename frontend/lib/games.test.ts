import { describe, expect, it } from "vitest";
import { GAME_ACCENT, GAME_LOGO, GAMES, SLUG_TO_GAME } from "./games";

// Every game DeckDen has ever supported, enabled or paused. Decks in a paused
// game still exist and must keep rendering, so the lookups must cover all of these.
const EVERY_GAME = ["Yu-Gi-Oh!", "Pokemon", "Union Arena"];

describe("games", () => {
  it("keeps colors and logos for every game, including paused ones", () => {
    for (const name of EVERY_GAME) {
      expect(GAME_ACCENT[name], `${name} accent`).toBeTruthy();
      expect(GAME_LOGO[name], `${name} logo`).toBeTruthy();
    }
  });

  it("only offers enabled games for navigation and pickers", () => {
    expect(GAMES.length).toBeGreaterThan(0);
    for (const game of GAMES) {
      expect(game.enabled).toBe(true);
    }
  });

  it("routes only the games it offers", () => {
    expect(Object.keys(SLUG_TO_GAME).sort()).toEqual(GAMES.map((g) => g.slug).sort());
    expect(Object.values(SLUG_TO_GAME).sort()).toEqual(GAMES.map((g) => g.name).sort());
  });
});
