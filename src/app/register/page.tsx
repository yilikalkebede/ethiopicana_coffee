"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSafeNextPath } from "@/lib/safeRedirect";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, email, password }),
    });

    setLoading(false);
    const data = await res.json().catch(() => ({}));

    // The API deliberately returns 200 with a generic error message for a
    // duplicate email (anti-enumeration) — no session is created in that
    // case, so `res.ok` alone isn't enough to tell success from failure.
    // Only a response carrying `user` actually means "you're signed in."
    if (!res.ok || !data.user) {
      setError(data.error ?? "Something went wrong. Please try again.");
      return;
    }

    router.push(getSafeNextPath(searchParams?.get("next") ?? null));
    router.refresh();
  }

  return (
    <section className="mx-auto max-w-sm px-6 py-24">
      <h1 className="text-3xl text-ink">Create an account</h1>
      <p className="mt-2 font-body text-sm text-ink-soft">
        Manage your subscription, orders, and rewards.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="font-body text-sm text-ink">
              First name
            </label>
            <input
              id="firstName"
              required
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 w-full border border-ink bg-paper px-4 py-3 font-body text-sm focus-visible:outline-belt-500"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="font-body text-sm text-ink">
              Last name
            </label>
            <input
              id="lastName"
              required
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 w-full border border-ink bg-paper px-4 py-3 font-body text-sm focus-visible:outline-belt-500"
            />
          </div>
        </div>

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
          <label htmlFor="password" className="font-body text-sm text-ink">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border border-ink bg-paper px-4 py-3 font-body text-sm focus-visible:outline-belt-500"
          />
          <p className="mt-1 font-body text-xs text-ink-soft">At least 10 characters.</p>
        </div>

        {error && (
          <p role="alert" className="border border-rust bg-rust/5 px-4 py-2 font-body text-sm text-rust">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 font-body text-sm text-ink-soft">
        Already have an account?{" "}
        <Link
          href={`/login${searchParams?.get("next") ? `?next=${encodeURIComponent(searchParams?.get("next") ?? "")}` : ""}`}
          className="text-belt-700 underline underline-offset-2"
        >
          Sign in
        </Link>
      </p>
    </section>
  );
}

// useSearchParams() opts the page into client-side rendering unless wrapped
// in Suspense — required by Next.js for static generation to succeed
// (https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout).
export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
