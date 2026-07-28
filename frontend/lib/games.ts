export const GAMES = [
  { name: "Yu-Gi-Oh!", slug: "yugioh", color: "bg-purple-600" },
  { name: "Pokemon", slug: "pokemon", color: "bg-yellow-500" },
  { name: "Union Arena", slug: "union-arena", color: "bg-blue-600" },
] as const;

export const SLUG_TO_GAME: Record<string, string> = Object.fromEntries(
  GAMES.map((g) => [g.slug, g.name])
);