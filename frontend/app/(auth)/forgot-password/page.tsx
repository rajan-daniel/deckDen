"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await apiFetch("/password-reset/request", {
        method: "POST",
        body: { email },
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm card-surface p-8">
        <h1 className="text-2xl font-semibold mb-1">Reset your password</h1>
        <p className="text-sm text-neutral-400 mb-6">
          Enter the email on your account and we&apos;ll send you a link to
          reset your password.
        </p>

        {submitted ? (
          <p className="text-sm text-neutral-300">
            If that email is registered, a reset link is on its way — check
            your inbox.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-field"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary py-2.5 mt-1"
            >
              {isSubmitting ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}

        <p className="text-sm text-neutral-400 mt-6 text-center">
          <Link href="/login" className="text-sky-400 font-medium hover:underline">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
