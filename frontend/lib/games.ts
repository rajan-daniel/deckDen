// Every game DeckDen knows about. Set `enabled: false` to pause a game: it
// disappears from navigation and pickers, but decks that already exist keep
// their colors and logos. Flip it back to `true` to restore it.
const ALL_GAMES = [
  {
    name: "Yu-Gi-Oh!",
    slug: "yugioh",
    enabled: true,
    color: "bg-gradient-to-br from-purple-500 to-fuchsia-700",
    logo: "/gameLogos/yugioh.png",
  },
  {
    name: "Pokemon",
    slug: "pokemon",
    enabled: false, // paused: card lookups are too slow on the free-tier backend
    color: "bg-gradient-to-br from-amber-400 to-orange-600",
    logo: "/gameLogos/pokemon.svg",
  },
  {
    name: "Union Arena",
    slug: "union-arena",
    enabled: true,
    color: "bg-gradient-to-br from-sky-500 to-blue-700",
    logo: "/gameLogos/unionArena.png",
  },
] as const;

// Enabled games only: drives navigation, game pickers, and the browse/new routes.
// Typed as the full union on purpose: without it TypeScript narrows away a game
// that is currently `enabled: false`, so code that mentions that game by name
// would stop compiling, and flipping the flag would no longer be a one-line change.
export const GAMES: readonly (typeof ALL_GAMES)[number][] = ALL_GAMES.filter((g) => g.enabled);

export const SLUG_TO_GAME: Record<string, string> = Object.fromEntries(
  GAMES.map((g) => [g.slug, g.name])
);

// Lookups for decks that already exist, so these cover paused games too.
export const GAME_ACCENT: Record<string, string> = Object.fromEntries(
  ALL_GAMES.map((g) => [g.name, g.color])
);

export const GAME_LOGO: Record<string, string> = Object.fromEntries(
  ALL_GAMES.map((g) => [g.name, g.logo])
);
