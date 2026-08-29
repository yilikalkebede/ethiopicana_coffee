import { prisma } from "@/lib/prisma";
import { DataTable } from "@/components/DataTable";
import { UserRoleControl } from "@/components/UserRoleControl";
import { UserStatusControl } from "@/components/UserStatusControl";

export async function UsersView({ currentUserId, q }: { currentUserId: string; q?: string }) {
  const where = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" as const } },
          { firstName: { contains: q, mode: "insensitive" as const } },
          { lastName: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true, createdAt: true },
  });

  return (
    <div>
      <h1 className="text-3xl text-ink">Users</h1>
      <p className="mt-2 font-body text-sm text-ink-soft">
        Role changes take effect immediately and are recorded in the audit log.
      </p>

      <form action="/admin/users" method="GET" className="mt-6">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name or email…"
          className="w-full max-w-sm border border-line bg-paper px-3 py-2 font-body text-sm text-ink focus-visible:outline-belt-500"
        />
      </form>

      <div className="mt-6">
        <DataTable
          headers={["Name", "Email", "Status", "Joined", "Role"]}
          isEmpty={users.length === 0}
          emptyMessage="No users match."
        >
          {users.map((u) => (
            <tr key={u.id} className="border-b border-line last:border-b-0 hover:bg-belt-50/50">
              <td className="px-4 py-3 text-ink">{u.firstName} {u.lastName}</td>
              <td className="px-4 py-3 text-ink-soft">{u.email}</td>
              <td className="px-4 py-3">
                <UserStatusControl
                  userId={u.id}
                  email={u.email}
                  status={u.status}
                  isSelf={u.id === currentUserId}
                />
              </td>
              <td className="px-4 py-3 text-ink-soft">{u.createdAt.toLocaleDateString()}</td>
              <td className="px-4 py-3">
                <UserRoleControl
                  userId={u.id}
                  email={u.email}
                  currentRole={u.role}
                  isSelf={u.id === currentUserId}
                />
              </td>
            </tr>
          ))}
        </DataTable>
      </div>
    </div>
  );
}
