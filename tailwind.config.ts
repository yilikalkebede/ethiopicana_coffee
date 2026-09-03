import type { Config } from "tailwindcss";

// ---------------------------------------------------------------------------
// ETHIOPICANA COFFEE — design tokens
//
// Concept: coffee only grows in a narrow band around the equator (the "bean
// belt", roughly 25°N–25°S). The brand treats every lot like a specimen
// pulled from that belt — a field journal, not a cafe menu. The signature
// element is a coordinate "specimen tag" (e.g. 6.2°N · 75.6°W) stamped on
// hero art and product cards.
//
// Palette avoids the generic cream+terracotta AI-default: paper is a
// warmer, more yellowed parchment (not #F4F1EA), the primary accent is a
// deep bottle green pulled from unroasted (green) coffee, and ochre is used
// sparingly as a second accent rather than the expected clay/terracotta.
// ---------------------------------------------------------------------------

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#EFE8D6", // parchment background
        ink: "#231E19", // near-black warm charcoal, primary text
        "ink-soft": "#5B5148", // secondary text on paper
        belt: {
          50: "#EEF2ED",
          100: "#D2DECB",
          300: "#8FA987",
          500: "#3F5D42", // primary brand green (unroasted bean)
          700: "#2A4030",
          900: "#182419",
        },
        ochre: {
          200: "#EAD3A3",
          400: "#C99A44",
          500: "#B8842E", // secondary accent, used sparingly — decorative only, fails text contrast on paper
          700: "#7A5720", // WCAG AA-compliant (~5:1 on paper) — the shade to use for ochre text
        },
        rust: "#A63D2F", // errors / alerts only
        line: "#D8CFB8", // hairline dividers on paper
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        body: ["var(--font-work-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        none: "0px",
        sm: "2px",
        DEFAULT: "3px",
        md: "4px",
        lg: "6px",
      },
      letterSpacing: {
        tag: "0.14em",
      },
    },
  },
  plugins: [],
};

export default config;
