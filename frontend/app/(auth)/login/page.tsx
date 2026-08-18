"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm card-surface p-8">
        <h1 className="text-2xl font-semibold mb-1">Welcome back</h1>
        <p className="text-sm text-neutral-400 mb-6">Log in to manage your decks.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input-field"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input-field"
          />
          <Link
            href="/forgot-password"
            className="text-sm text-sky-400 font-medium hover:underline self-end -mt-2"
          >
            Forgot password?
          </Link>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary py-2.5 mt-1"
          >
            {isSubmitting ? "Logging in..." : "Log in"}
          </button>
        </form>
        <p className="text-sm text-neutral-400 mt-6 text-center">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-sky-400 font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}