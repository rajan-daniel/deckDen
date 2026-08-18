"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api";
import { ProtectedRoute } from "@/app/components/protected-route";

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
