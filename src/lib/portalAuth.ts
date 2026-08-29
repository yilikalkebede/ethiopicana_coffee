import { redirect } from "next/navigation";
import { getCurrentUser, hasAtLeastRole } from "@/lib/auth";
import type { RoleName, User } from "@prisma/client";

/**
 * Server-component equivalent of requireRole() (src/lib/auth.ts), which
 * throws — server components need to redirect instead. Used by every
 * /admin and /manager page so both route namespaces enforce the exact same
 * "logged in + at least this role" check the same way, in one line.
 */
export async function requirePortalUser(minRole: RoleName, currentPath: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(currentPath)}`);
  if (!hasAtLeastRole(user, minRole)) redirect("/account");
  return user;
}
