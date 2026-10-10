"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  browserSupportsWebAuthn,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
} from "@simplewebauthn/browser";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api";
import { ProtectedRoute } from "@/app/components/protected-route";

type Passkey = {
  id: number;
  device_label: string | null;
  created_at: string;
  last_used_at: string | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function PasskeySettings({ token }: { token: string | null }) {
  const [passkeys, setPasskeys] = useState<Passkey[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  // Browser-only capability: server snapshot is `true` so SSR and first paint match.
  const supported = useSyncExternalStore(
    () => () => {},
    browserSupportsWebAuthn,
    () => true
  );

  const loadPasskeys = useCallback(async () => {
    const list = await apiFetch<Passkey[]>("/webauthn/credentials", { token });
    setPasskeys(list);
  }, [token]);

  useEffect(() => {
    // Guard against a stale response landing after unmount or a token change.
    let cancelled = false;
    apiFetch<Passkey[]>("/webauthn/credentials", { token })
      .then((list) => {
        if (!cancelled) setPasskeys(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Couldn't load your passkeys");
          setPasskeys([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleAdd() {
    setError(null);
    setIsAdding(true);
    try {
      const options = await apiFetch<PublicKeyCredentialCreationOptionsJSON>(
        "/webauthn/register/options",
        { method: "POST", token }
      );
      const attestation = await startRegistration({ optionsJSON: options });
      await apiFetch("/webauthn/register/verify", {
        method: "POST",
        token,
        body: attestation,
      });
      await loadPasskeys();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error && err.name === "NotAllowedError") {
        setError("Passkey setup was cancelled or timed out. Try again when you're ready.");
      } else if (err instanceof Error && err.name === "InvalidStateError") {
        setError("This device already has a passkey for DeckDen.");
      } else {
        setError("Couldn't add a passkey. Please try again.");
      }
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRemove(id: number) {
    setError(null);
    setRemovingId(id);
    try {
      await apiFetch(`/webauthn/credentials/${id}`, { method: "DELETE", token });
      setPasskeys((prev) => (prev ? prev.filter((p) => p.id !== id) : prev));
      setConfirmingId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't remove that passkey");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="card-surface p-6 mb-6">
      <h2 className="text-lg font-medium mb-1">Passkeys</h2>
      <p className="text-sm text-neutral-400 mb-4">
        A passkey lets you sign in with your device&apos;s fingerprint, face, or
        PIN instead of a password. You can have more than one.
      </p>

      {passkeys === null ? (
        <p className="text-sm text-neutral-500 mb-4">Loading your passkeys...</p>
      ) : passkeys.length === 0 ? (
        <p className="text-sm text-neutral-500 mb-4">You haven&apos;t added a passkey yet.</p>
      ) : (
        <ul className="mb-4 divide-y divide-neutral-800">
          {passkeys.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm text-neutral-200 truncate">
                  {p.device_label ?? `Passkey added ${formatDate(p.created_at)}`}
                </p>
                <p className="text-xs text-neutral-500">
                  {p.last_used_at ? `Last used ${formatDate(p.last_used_at)}` : "Never used"}
                </p>
              </div>

              {confirmingId === p.id ? (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleRemove(p.id)}
                    disabled={removingId === p.id}
                    className="btn-danger border border-red-500/40"
                  >
                    {removingId === p.id ? "Removing..." : "Confirm remove"}
                  </button>
                  <button
                    onClick={() => setConfirmingId(null)}
                    disabled={removingId === p.id}
                    className="btn-ghost"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingId(p.id)}
                  className="btn-danger shrink-0"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      {supported ? (
        <button onClick={handleAdd} disabled={isAdding} className="btn-secondary">
          {isAdding ? "Waiting for your device..." : "Add a passkey"}
        </button>
      ) : (
        <p className="text-sm text-neutral-500">
          This browser doesn&apos;t support passkeys.
        </p>
      )}
    </div>
  );
}

function AccountSettings() {
  const { user, token, logout } = useAuth();

  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = confirmText.length > 0 && confirmText === user?.username;

  async function handleDelete() {
    if (!canDelete) return;
    setError(null);
    setIsDeleting(true);

    try {
      await apiFetch("/me", { method: "DELETE", token });
      logout();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete account");
      setIsDeleting(false);
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto mt-16 px-4 pb-16">
      <h1 className="text-2xl font-semibold mb-1">Account</h1>
      <p className="text-neutral-400 text-sm mb-8">
        Signed in as <span className="text-neutral-200">{user?.username}</span>{" "}
        ({user?.email})
      </p>

      <PasskeySettings token={token} />

      <div className="card-surface p-6 border-red-500/30">
        <h2 className="text-lg font-medium text-red-400 mb-1">Danger zone</h2>
        <p className="text-sm text-neutral-400 mb-4">
          Deleting your account permanently removes your profile and every
          deck you own — public and private. This can&apos;t be undone.
        </p>

        <label className="block text-sm text-neutral-400 mb-2">
          Type <span className="text-neutral-200 font-medium">{user?.username}</span>{" "}
          to confirm
        </label>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={user?.username}
          className="input-field mb-4"
        />

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <button
          onClick={handleDelete}
          disabled={!canDelete || isDeleting}
          className="btn-danger border border-red-500/40"
        >
          {isDeleting ? "Deleting..." : "Delete my account"}
        </button>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <ProtectedRoute>
      <AccountSettings />
    </ProtectedRoute>
  );
}
