// Only ever redirect to a same-origin path after auth. `next` comes from
// the URL (attacker-controlled), so an absolute or protocol-relative value
// like "https://evil.example" or "//evil.example" must never be honored —
// that would turn a normal login/register into an open redirect.
export function getSafeNextPath(raw: string | null, fallback = "/account"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return fallback;
  }
  return raw;
}
