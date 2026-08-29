"use client";

import "./globals.css";

/**
 * Catches an error thrown by the root layout itself (route-level error.tsx
 * boundaries can't — they render inside the layout, so they're powerless if
 * the layout is what broke). Must render its own <html>/<body>, since it
 * fully replaces the root layout when active.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <section className="mx-auto max-w-2xl px-6 py-28 text-center">
          <p className="specimen-tag">Error</p>
          <h1 className="mt-6 text-4xl text-ink">Something went wrong.</h1>
          <p className="mt-4 font-body text-ink-soft">
            We hit an unexpected error. Try again, or come back in a moment.
          </p>
          <button type="button" onClick={reset} className="btn-primary mt-8">
            Try again
          </button>
        </section>
      </body>
    </html>
  );
}
