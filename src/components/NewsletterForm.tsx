"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const res = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Please try again.");
      setStatus("error");
      return;
    }

    setStatus("done");
  }

  if (status === "done") {
    return <p className="mt-6 font-body text-sm text-belt-700">You&apos;re subscribed. Check your inbox.</p>;
  }

  return (
    <div>
      <form onSubmit={submit} className="mt-6 flex gap-2">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full border border-ink bg-paper px-4 py-3 font-body text-sm text-ink placeholder:text-ink-soft focus-visible:outline-belt-500"
        />
        <button type="submit" disabled={status === "submitting"} className="btn-primary shrink-0 disabled:opacity-60">
          {status === "submitting" ? "Subscribing…" : "Subscribe"}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-2 font-body text-sm text-rust">
          {error}
        </p>
      )}
    </div>
  );
}
