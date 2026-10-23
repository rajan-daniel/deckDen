import { describe, expect, it } from "vitest";
import { DeckSchema, DeckSummarySchema } from "../src/schemas.js";

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

// What the backend really sends for GET /me/decks/{id} (DeckWithCardsResponse).
const rawDeck = {
  id: 7,
  name: "Bleach Aggro",
  game: "Union Arena",
  format: "Standard",
  play_style: "Aggro",
  description: "Fast rush deck",
  is_public: false,
  owner_id: 3,
  cards: [
    {
      id: 101,
      deck_id: 7,
      card_name: "Uryu Ishida",
      external_card_id: "UE01ST/BLC-1-034",
      image_url: "https://example.com/card.png",
      quantity: 4,
      category: "Character",
      notes: "Main attacker",
    },
  ],
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

describe("DeckSchema", () => {
  it("keeps only the deck and card fields the assistant needs", () => {
    const deck = DeckSchema.parse(rawDeck);

    expect(deck).toEqual({
      id: 7,
      name: "Bleach Aggro",
      game: "Union Arena",
      format: "Standard",
      play_style: "Aggro",
      description: "Fast rush deck",
      is_public: false,
      cards: [
        {
          card_name: "Uryu Ishida",
          external_card_id: "UE01ST/BLC-1-034",
          quantity: 4,
          category: "Character",
          notes: "Main attacker",
        },
      ],
    });
  });

  it("accepts null for a card's optional fields", () => {
    const deck = DeckSchema.parse({
      ...rawDeck,
      cards: [
        { ...rawDeck.cards[0], external_card_id: null, category: null, notes: null },
      ],
    });

    expect(deck.cards[0]?.external_card_id).toBeNull();
    expect(deck.cards[0]?.category).toBeNull();
    expect(deck.cards[0]?.notes).toBeNull();
  });

  it("accepts a deck with no cards yet", () => {
    const deck = DeckSchema.parse({ ...rawDeck, cards: [] });

    expect(deck.cards).toEqual([]);
  });

  it("rejects a card whose quantity is not a whole number", () => {
    const result = DeckSchema.safeParse({
      ...rawDeck,
      cards: [{ ...rawDeck.cards[0], quantity: "4" }],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["cards", 0, "quantity"]);
  });

  it("rejects a deck with no cards list", () => {
    const result = DeckSchema.safeParse({ ...rawDeck, cards: undefined });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["cards"]);
  });
});
