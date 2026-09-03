export type NormalizedCard = {
  name: string;
  externalId: string;
  imageUrl: string;
};

type YgoprodeckCard = {
  id: number;
  name: string;
  card_images?: { image_url_small?: string }[];
};

async function searchYuGiOh(query: string): Promise<NormalizedCard[]> {
  const res = await fetch(
    `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(query)}`
  );
  // YGOPRODeck returns 400 for a legitimate zero-results search, not just for
  // real failures — so a non-ok response here means "no matches," not
  // "something broke." Unlike the other two searches below, this one should
  // stay silent rather than surface as a search error.
  if (!res.ok) return [];
  const data = await res.json();
  return (data.data ?? []).slice(0, 50).map((card: YgoprodeckCard) => ({
    name: card.name,
    externalId: String(card.id),
    imageUrl: card.card_images?.[0]?.image_url_small ?? "",
  }));
}

async function searchPokemon(query: string): Promise<NormalizedCard[]> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const res = await fetch(
    `${API_URL}/card-search/pokemon?q=${encodeURIComponent(query)}`
  );
  // Proxied through our own backend so the Pokemon TCG API key stays
  // server-side. Our own backend only ever returns non-ok for a real
  // failure — a zero-match search still comes back 200 with an empty array.
  if (!res.ok) throw new Error("Pokemon card search failed");
  return res.json();
}

async function searchUnionArena(query: string): Promise<NormalizedCard[]> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const res = await fetch(
    `${API_URL}/card-search/union-arena?q=${encodeURIComponent(query)}`
  );
  // Our own backend only ever returns non-ok for a real failure — a
  // zero-match search still comes back 200 with an empty array.
  if (!res.ok) throw new Error("Union Arena card search failed");
  return res.json();
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