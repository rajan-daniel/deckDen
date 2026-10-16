"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format-date";

type AccessToken = {
  id: number;
  name: string;
  token_prefix: string;
  scope: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string;
};

// What POST /me/tokens returns: the one and only time the plaintext exists.
type CreatedAccessToken = AccessToken & { token: string };

function isExpired(iso: string) {
  return new Date(iso).getTime() <= Date.now();
}

export function AccessTokenSettings({ token }: { token: string | null }) {
  const [tokens, setTokens] = useState<AccessToken[] | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  // The plaintext token lives ONLY here, in memory. It is never written to
  // localStorage, the URL, or anywhere else, so reloading or leaving the page
  // loses it for good. That is the "shown once" promise.
  const [newToken, setNewToken] = useState<string | null>(null);

  useEffect(() => {
    // Guard against a stale response landing after unmount or a token change.
    let cancelled = false;
    apiFetch<AccessToken[]>("/me/tokens", { token })
      .then((list) => {
        if (!cancelled) setTokens(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Couldn't load your connected assistants");
          setTokens([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setError(null);
    setNewToken(null);
    setCopyState("idle");
    setIsCreating(true);

    try {
      const created = await apiFetch<CreatedAccessToken>("/me/tokens", {
        method: "POST",
        token,
        body: { name: trimmed },
      });
      // Split the secret off: only the summary goes into the list.
      const { token: plaintext, ...summary } = created;
      setNewToken(plaintext);
      setTokens((prev) => [summary, ...(prev ?? [])]);
      setName("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't connect an assistant. Please try again.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCopy() {
    if (!newToken) return;
    try {
      await navigator.clipboard.writeText(newToken);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  function dismissNewToken() {
    setNewToken(null);
    setCopyState("idle");
  }

  async function handleDisconnect(id: number) {
    setError(null);
    setRemovingId(id);
    try {
      await apiFetch(`/me/tokens/${id}`, { method: "DELETE", token });
      setTokens((prev) => (prev ? prev.filter((t) => t.id !== id) : prev));
      setConfirmingId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't disconnect that assistant");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="card-surface p-6 mb-6">
      <h2 className="text-lg font-medium mb-1">AI assistants</h2>
      <p className="text-sm text-neutral-400 mb-4">
        Connect an AI assistant to work with your decks. It can read your decks,
        including private ones, and your username and email. It can&apos;t
        change anything.
      </p>

      {tokens === null ? (
        <p className="text-sm text-neutral-500 mb-4">Loading your connected assistants...</p>
      ) : tokens.length === 0 ? (
        <p className="text-sm text-neutral-500 mb-4">No assistants connected yet.</p>
      ) : (
        <ul className="mb-4 divide-y divide-neutral-800">
          {tokens.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm text-neutral-200 truncate">
                  {t.name}{" "}
                  <span className="font-mono text-xs text-neutral-500">{t.token_prefix}…</span>
                </p>
                <p className="text-xs text-neutral-500">
                  {t.last_used_at ? `Last used ${formatDate(t.last_used_at)}` : "Never used"}
                  {" · "}
                  {isExpired(t.expires_at)
                    ? `Expired ${formatDate(t.expires_at)}`
                    : `Expires if unused ${formatDate(t.expires_at)}`}
                </p>
              </div>

              {confirmingId === t.id ? (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDisconnect(t.id)}
                    disabled={removingId === t.id}
                    className="btn-danger border border-red-500/40"
                  >
                    {removingId === t.id ? "Disconnecting..." : "Confirm disconnect"}
                  </button>
                  <button
                    onClick={() => setConfirmingId(null)}
                    disabled={removingId === t.id}
                    className="btn-ghost"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmingId(t.id)} className="btn-danger shrink-0">
                  Disconnect
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      <form onSubmit={handleConnect} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          aria-label="Assistant name"
          placeholder="Name it, e.g. Claude Desktop"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          className="input-field"
        />
        <button
          type="submit"
          disabled={isCreating || !name.trim()}
          className="btn-secondary shrink-0"
        >
          {isCreating ? "Connecting..." : "Connect an assistant"}
        </button>
      </form>

      {newToken && (
        <div role="status" className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-200 mb-2">
            Copy your token now. You won&apos;t be able to see it again.
          </p>
          <code
            data-testid="new-token"
            className="block break-all rounded-lg bg-neutral-950 px-3 py-2 text-xs text-neutral-200 select-all"
          >
            {newToken}
          </code>
          <div className="mt-3 flex items-center gap-2">
            <button onClick={handleCopy} className="btn-secondary">
              {copyState === "copied" ? "Copied" : "Copy"}
            </button>
            <button onClick={dismissNewToken} className="btn-ghost">
              Done
            </button>
          </div>
          {copyState === "failed" && (
            <p className="text-sm text-red-400 mt-2">
              Couldn&apos;t copy automatically. Select the token above and copy it yourself.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
