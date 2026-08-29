import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { UsersView } from "@/components/UsersView";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const user = await requirePortalUser("ADMIN", "/admin/users");
  const q = typeof searchParams.q === "string" ? searchParams.q : undefined;

  return (
    <PortalShell basePath="/admin" roleLabel="Admin" active="users">
      <UsersView currentUserId={user.id} q={q} />
    </PortalShell>
  );
}
