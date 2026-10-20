import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("returns the config for a valid URL and token", () => {
    const config = loadConfig({
      DECKDEN_API_URL: "https://api.example.com",
      DECKDEN_TOKEN: "dd_pat_abc123",
    });

    expect(config).toEqual({
      apiUrl: "https://api.example.com",
      token: "dd_pat_abc123",
    });
  });

  it("accepts every character a real token can contain", () => {
    const token = "dd_pat_Ab0-_Zz9";

    const config = loadConfig({
      DECKDEN_API_URL: "https://api.example.com",
      DECKDEN_TOKEN: token,
    });

    expect(config.token).toBe(token);
  });

  it("rejects a missing URL", () => {
    const load = () => loadConfig({ DECKDEN_TOKEN: "dd_pat_abc123" });

    expect(load).toThrow(ConfigError);
    expect(load).toThrow("DECKDEN_API_URL is not set.");
  });
  //TOKEN TESTS
  it("rejects a missing token", () => {
    const load = () =>
      loadConfig({ DECKDEN_API_URL: "https://api.example.com" });

    expect(load).toThrow(ConfigError);
    expect(load).toThrow("DECKDEN_TOKEN is not set.");
  });

  it("rejects an empty token", () => {
    const load = () =>
      loadConfig({
        DECKDEN_API_URL: "https://api.example.com",
        DECKDEN_TOKEN: "",
      });

    expect(load).toThrow(ConfigError);
    expect(load).toThrow("DECKDEN_TOKEN is not set.");
  });

  const WHITESPACE = "DECKDEN_TOKEN must not contain spaces or line breaks.";
  const FORMAT = "DECKDEN_TOKEN is not in the expected format.";

  it.each([
    ["a trailing newline", "dd_pat_abc\n", WHITESPACE],
    ["quotes around it", '"dd_pat_abc"', FORMAT],
    ['"Bearer " in front of it', "Bearer dd_pat_abc", WHITESPACE],
    ["a different service's prefix", "ghp_abc123", FORMAT],
    ["only the prefix", "dd_pat_", FORMAT],
    ["a character outside the allowed set", "dd_pat_abc.def", FORMAT],
  ])("rejects a token with %s", (_label, token, message) => {
    const load = () =>
      loadConfig({
        DECKDEN_API_URL: "https://api.example.com",
        DECKDEN_TOKEN: token,
      });

    expect(load).toThrow(ConfigError);
    expect(load).toThrow(message);
  });

  //URL TESTS
  const HTTPS_ONLY = "DECKDEN_API_URL must start with https://";
  const INVALID_URL = "DECKDEN_API_URL is not a valid URL.";
  const URL_WHITESPACE =
    "DECKDEN_API_URL must not contain spaces or line breaks.";
  const VALID_TOKEN = "dd_pat_abc123";

  it.each([
    ["plain http on a remote host", "http://api.example.com", HTTPS_ONLY],
    ["a URL with no scheme", "api.example.com", INVALID_URL],
    ["localhost with no scheme", "localhost:8000", HTTPS_ONLY],
    ["a non-web scheme", "ftp://api.example.com", HTTPS_ONLY],
    [
      "a URL with spaces around it",
      " https://api.example.com ",
      URL_WHITESPACE,
    ],
  ])("rejects %s", (_label, url, message) => {
    const load = () =>
      loadConfig({ DECKDEN_API_URL: url, DECKDEN_TOKEN: VALID_TOKEN });

    expect(load).toThrow(ConfigError);
    expect(load).toThrow(message);
  });

  it.each([
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://[::1]:8000",
  ])("allows plain http for %s", (url) => {
    const config = loadConfig({
      DECKDEN_API_URL: url,
      DECKDEN_TOKEN: VALID_TOKEN,
    });

    expect(config.apiUrl).toBe(url);
  });

  it("removes a trailing slash from the URL", () => {
    const config = loadConfig({
      DECKDEN_API_URL: "https://api.example.com/",
      DECKDEN_TOKEN: VALID_TOKEN,
    });

    expect(config.apiUrl).toBe("https://api.example.com");
  });
});
