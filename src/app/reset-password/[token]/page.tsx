"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: params.token, password }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/login"), 2000);
  }

  return (
    <section className="mx-auto max-w-sm px-6 py-24">
      <h1 className="text-3xl text-ink">Set a new password</h1>

      {success ? (
        <p className="mt-6 font-body text-sm text-belt-700">Password updated — redirecting you to sign in…</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="password" className="font-body text-sm text-ink">
              New password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full border border-ink bg-paper px-4 py-3 font-body text-sm focus-visible:outline-belt-500"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="font-body text-sm text-ink">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full border border-ink bg-paper px-4 py-3 font-body text-sm focus-visible:outline-belt-500"
            />
          </div>

          {error && (
            <p role="alert" className="border border-rust bg-rust/5 px-4 py-2 font-body text-sm text-rust">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
            {submitting ? "Saving…" : "Reset password"}
          </button>
        </form>
      )}

      <p className="mt-6 font-body text-sm text-ink-soft">
        <Link href="/login" className="text-belt-700 underline underline-offset-2">
          Back to sign in
        </Link>
      </p>
    </section>
  );
}
