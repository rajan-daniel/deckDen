"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { Loading } from "@/app/components/loading";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch("/password-reset/confirm", {
        method: "POST",
        body: { token, new_password: password },
      });
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="w-full max-w-sm card-surface p-8 text-center">
        <p className="text-red-400 text-sm">
          This reset link is missing its token. Request a new one from the{" "}
          <Link href="/forgot-password" className="text-sky-400 font-medium hover:underline">
            forgot password
          </Link>{" "}
          page.
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full max-w-sm card-surface p-8 text-center">
        <p className="text-neutral-200 text-sm">
          Your password has been updated. Redirecting you to log in...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm card-surface p-8">
      <h1 className="text-2xl font-semibold mb-1">Set a new password</h1>
      <p className="text-sm text-neutral-400 mb-6">
        Choose a new password for your account.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="input-field"
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="input-field"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary py-2.5 mt-1"
        >
          {isSubmitting ? "Updating..." : "Update password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <Suspense fallback={<Loading />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
