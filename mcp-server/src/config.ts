export type Config = {
  readonly apiUrl: string;
  readonly token: string;
};

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

const TOKEN_PATTERN = /^dd_pat_[A-Za-z0-9_-]+$/;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function readRequired(env: Record<string, string | undefined>, name: string): string {
  const value = env[name];
  if (value === undefined || value === "") {
    throw new ConfigError(`${name} is not set.`);
  }
  if (/\s/.test(value)) {
    throw new ConfigError(`${name} must not contain spaces or line breaks.`);
  }
  return value;
}

function parseApiUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ConfigError("DECKDEN_API_URL is not a valid URL. Include https://, e.g. https://example.com");
  }

  const isHttps = url.protocol === "https:";
  const isLocalHttp = url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname);
  if (!isHttps && !isLocalHttp) {
    throw new ConfigError("DECKDEN_API_URL must start with https:// (plain http:// is only allowed for localhost).");
  }

  return raw.replace(/\/+$/, "");
}

function parseToken(raw: string): string {
  if (!TOKEN_PATTERN.test(raw)) {
    throw new ConfigError(
      "DECKDEN_TOKEN is not in the expected format. It should be dd_pat_ followed by letters, numbers, - or _, with nothing else around it."
    );
  }
  return raw;
}

export function loadConfig(env: Record<string, string | undefined>): Config {
  const apiUrl = parseApiUrl(readRequired(env, "DECKDEN_API_URL"));
  const token = parseToken(readRequired(env, "DECKDEN_TOKEN"));
  return { apiUrl, token };
}