import { z } from "zod";

// The fields a deck and a deck summary have in common.
const DeckBaseSchema = z.object({
  id: z.int(),
  name: z.string(),
  game: z.string(),
  format: z.string().nullable(),
  play_style: z.string().nullable(),
  description: z.string().nullable(),
  is_public: z.boolean(),
});

export const DeckSummarySchema = DeckBaseSchema.extend({
  card_count: z.int(),
});

export const DeckCardSchema = z.object({
  card_name: z.string(),
  external_card_id: z.string().nullable(),
  quantity: z.int(),
  category: z.string().nullable(),
  notes: z.string().nullable(),
});

export const DeckSchema = DeckBaseSchema.extend({
  cards: z.array(DeckCardSchema),
});

export type DeckSummarySchema = z.infer<typeof DeckSummarySchema>;
