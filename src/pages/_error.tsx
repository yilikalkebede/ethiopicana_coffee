import type { NextPageContext } from "next";

/**
 * This app is pure App Router (src/app/not-found.tsx, src/app/global-error.tsx
 * handle real user-facing 404/error UX). This file exists only to override
 * Next.js's internal legacy Pages-Router-style fallback used to build the
 * auto-generated /404 and /500 export pages — without an explicit override,
 * that internal fallback hits a well-documented Next.js 14 bug
 * ("<Html> should not be imported outside of pages/_document") during static
 * export in some build environments. This is Next's own documented default
 * _error.js implementation, verbatim — not meant to ever actually render.
 */
function Error({ statusCode }: { statusCode?: number }) {
  return <p>{statusCode ? `An error ${statusCode} occurred on server` : "An error occurred on client"}</p>;
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
