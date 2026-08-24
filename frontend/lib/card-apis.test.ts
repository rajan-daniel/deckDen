import { afterEach, describe, expect, it, vi } from "vitest";
import { getCardSearchFn } from "./card-apis";

function mockFetchOnce(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response as Response));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getCardSearchFn", () => {
  it("returns a function that always resolves to [] for an unknown game", async () => {
    const search = getCardSearchFn("Magic: The Gathering");

    await expect(search("bolt")).resolves.toEqual([]);
  });

  describe("Yu-Gi-Oh!", () => {
    it("normalizes matches from YGOPRODeck", async () => {
      mockFetchOnce({
        ok: true,
        json: async () => ({
          data: [{ id: 12345, name: "Dark Magician", card_images: [{ image_url_small: "https://x/dm.png" }] }],
        }),
      });

      const result = await getCardSearchFn("Yu-Gi-Oh!")("dark magician");

      expect(result).toEqual([{ name: "Dark Magician", externalId: "12345", imageUrl: "https://x/dm.png" }]);
    });

    it("treats a non-ok response as zero results, not an error", async () => {
      mockFetchOnce({ ok: false });

      await expect(getCardSearchFn("Yu-Gi-Oh!")("asdf")).resolves.toEqual([]);
    });
  });

  describe("Pokemon", () => {
    it("passes through the backend's already-normalized results", async () => {
      mockFetchOnce({
        ok: true,
        json: async () => [{ name: "Pikachu", externalId: "base1-58", imageUrl: "https://x/pika.png" }],
      });

      const result = await getCardSearchFn("Pokemon")("pikachu");

      expect(result).toEqual([{ name: "Pikachu", externalId: "base1-58", imageUrl: "https://x/pika.png" }]);
    });

    it("throws on a non-ok response, since that always means a real failure", async () => {
      mockFetchOnce({ ok: false });

      await expect(getCardSearchFn("Pokemon")("asdf")).rejects.toThrow("Pokemon card search failed");
    });
  });

  describe("Union Arena", () => {
    it("passes through the backend's already-normalized results", async () => {
      mockFetchOnce({
        ok: true,
        json: async () => [{ name: "Monkey D. Luffy", externalId: "UA01BT-001", imageUrl: "" }],
      });

      const result = await getCardSearchFn("Union Arena")("luffy");

      expect(result).toEqual([{ name: "Monkey D. Luffy", externalId: "UA01BT-001", imageUrl: "" }]);
    });

    it("throws on a non-ok response", async () => {
      mockFetchOnce({ ok: false });

      await expect(getCardSearchFn("Union Arena")("asdf")).rejects.toThrow("Union Arena card search failed");
    });
  });
});
