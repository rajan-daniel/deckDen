import { describe, expect, it } from "vitest";
import { DeckSummarySchema } from "../src/schemas.js";

// What the backend really sends for GET /me/decks (DeckSummaryResponse).
const rawSummary = {
  id: 7,
  name: "Bleach Aggro",
  game: "Union Arena",
  format: "Standard",
  play_style: "Aggro",
  description: "Fast rush deck",
  is_public: false,
  owner_id: 3,
  owner_username: "alice",
  preview_image_url: "https://example.com/card.png",
  card_count: 50,
};

describe("DeckSummarySchema", () => {
  it("keeps only the fields the assistant needs", () => {
    const summary = DeckSummarySchema.parse(rawSummary);

    expect(summary).toEqual({
      id: 7,
      name: "Bleach Aggro",
      game: "Union Arena",
      format: "Standard",
      play_style: "Aggro",
      description: "Fast rush deck",
      is_public: false,
      card_count: 50,
    });
  });

  it("accepts null for the optional text fields", () => {
    const summary = DeckSummarySchema.parse({
      ...rawSummary,
      format: null,
      play_style: null,
      description: null,
    });

    expect(summary.format).toBeNull();
    expect(summary.play_style).toBeNull();
    expect(summary.description).toBeNull();
  });

  it.each([
    ["id as a string", { ...rawSummary, id: "7" }, "id"],
    [
      "is_public as a string",
      { ...rawSummary, is_public: "false" },
      "is_public",
    ],
    [
      "card_count as a decimal",
      { ...rawSummary, card_count: 2.5 },
      "card_count",
    ],
    ["no name", { ...rawSummary, name: undefined }, "name"],
    ["no card_count", { ...rawSummary, card_count: undefined }, "card_count"],
  ])("rejects a deck with %s", (_label, input, field) => {
    const result = DeckSummarySchema.safeParse(input);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([field]);
  });

  it("accepts a game it has not heard of", () => {
    const summary = DeckSummarySchema.parse({ ...rawSummary, game: "Lorcana" });

    expect(summary.game).toBe("Lorcana");
  });
});
