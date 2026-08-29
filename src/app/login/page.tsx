"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSafeNextPath } from "@/lib/safeRedirect";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Please try again.");
      return;
    }

    router.push(getSafeNextPath(searchParams.get("next")));
    router.refresh();
  }

  return (
    <section className="mx-auto max-w-sm px-6 py-24">
      <h1 className="text-3xl text-ink">Sign in</h1>
      <p className="mt-2 font-body text-sm text-ink-soft">
        Manage your subscription, orders, and rewards.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="email" className="font-body text-sm text-ink">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-ink bg-paper px-4 py-3 font-body text-sm focus-visible:outline-belt-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="font-body text-sm text-ink">
              Password
            </label>
            <Link href="/forgot-password" className="font-body text-xs text-ink-soft hover:text-belt-700">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border border-ink bg-paper px-4 py-3 font-body text-sm focus-visible:outline-belt-500"
          />
        </div>

        {error && (
          <p role="alert" className="border border-rust bg-rust/5 px-4 py-2 font-body text-sm text-rust">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 font-body text-sm text-ink-soft">
        New here?{" "}
        <Link
          href={`/register${searchParams.get("next") ? `?next=${encodeURIComponent(searchParams.get("next") ?? "")}` : ""}`}
          className="text-belt-700 underline underline-offset-2"
        >
          Create an account
        </Link>
      </p>
    </section>
  );
}
