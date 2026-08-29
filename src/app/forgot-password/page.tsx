"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setSubmitting(false);
    setSubmitted(true);
  }

  return (
    <section className="mx-auto max-w-sm px-6 py-24">
      <h1 className="text-3xl text-ink">Reset your password</h1>

      {submitted ? (
        <p className="mt-6 font-body text-sm text-ink-soft">
          If that email is registered, we&apos;ve sent a link to reset your password.
        </p>
      ) : (
        <>
          <p className="mt-2 font-body text-sm text-ink-soft">Enter your email and we&apos;ll send you a reset link.</p>
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
            <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
              {submitting ? "Sending…" : "Send reset link"}
            </button>
          </form>
        </>
      )}

      <p className="mt-6 font-body text-sm text-ink-soft">
        <Link href="/login" className="text-belt-700 underline underline-offset-2">
          Back to sign in
        </Link>
      </p>
    </section>
  );
}
