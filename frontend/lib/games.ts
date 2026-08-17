export const GAMES = [
  {
    name: "Yu-Gi-Oh!",
    slug: "yugioh",
    color: "bg-gradient-to-br from-purple-500 to-fuchsia-700",
    logo: "/gameLogos/yugioh.png",
  },
  {
    name: "Pokemon",
    slug: "pokemon",
    color: "bg-gradient-to-br from-amber-400 to-orange-600",
    logo: "/gameLogos/pokemon.svg",
  },
  {
    name: "Union Arena",
    slug: "union-arena",
    color: "bg-gradient-to-br from-sky-500 to-blue-700",
    logo: "/gameLogos/unionArena.png",
  },
] as const;

export const SLUG_TO_GAME: Record<string, string> = Object.fromEntries(
  GAMES.map((g) => [g.slug, g.name])
);

export const GAME_ACCENT: Record<string, string> = Object.fromEntries(
  GAMES.map((g) => [g.name, g.color])
);

export const GAME_LOGO: Record<string, string> = Object.fromEntries(
  GAMES.map((g) => [g.name, g.logo])
);