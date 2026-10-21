import { z } from "zod";

export const DeckSummarySchema = z.object({
  id: z.int(),
  name: z.string(),
  game: z.string(),
  format: z.string().nullable(),
  play_style: z.string().nullable(),
  description: z.string().nullable(),
  is_public: z.boolean(),
  card_count: z.int()
});

export type DeckSummarySchema = z.infer<typeof DeckSummarySchema>;
