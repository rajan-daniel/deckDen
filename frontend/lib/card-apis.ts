export type NormalizedCard = {
  name: string;
  externalId: string;
  imageUrl: string;
};

async function searchYuGiOh(query: string): Promise<NormalizedCard[]> {
  const res = await fetch(
    `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(query)}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.data ?? []).slice(0, 8).map((card: any) => ({
    name: card.name,
    externalId: String(card.id),
    imageUrl: card.card_images?.[0]?.image_url_small ?? "",
  }));
}

async function searchPokemon(query: string): Promise<NormalizedCard[]> {
  const res = await fetch(
    `https://api.pokemontcg.io/v2/cards?q=name:${encodeURIComponent(query)}*&pageSize=8`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.data ?? []).map((card: any) => ({
    name: card.name,
    externalId: card.id,
    imageUrl: card.images?.small ?? "",
  }));
}

async function searchUnionArena(): Promise<NormalizedCard[]> {
  // No public API currently exists for Union Arena.
  // Returning an empty list means CardSearch will show "no results" —
  // this game falls back to manual entry (handled separately).
  return [];
}

export function getCardSearchFn(game: string) {
  switch (game) {
    case "Yu-Gi-Oh!":
      return searchYuGiOh;
    case "Pokemon":
      return searchPokemon;
    case "Union Arena":
      return searchUnionArena;
    default:
      return async () => [];
  }
}