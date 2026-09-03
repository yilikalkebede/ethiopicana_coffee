import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DataTable } from "@/components/DataTable";

export async function JournalPostsView({ basePath }: { basePath: "/admin" | "/manager" }) {
  const posts = await prisma.journalPost.findMany({ orderBy: { createdAt: "desc" }, include: { category: true } });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl text-ink">Journal</h1>
        <Link href={`${basePath}/journal/new`} className="btn-primary !px-5 !py-2 text-sm">
          + New post
        </Link>
      </div>

      <div className="mt-6">
        <DataTable
          headers={["Title", "Category", "Status", "Published", "Updated", ""]}
          isEmpty={posts.length === 0}
          emptyMessage="No posts yet."
        >
          {posts.map((post) => (
            <tr key={post.id} className="border-b border-line last:border-b-0 hover:bg-belt-50/50">
              <td className="px-4 py-3">
                <Link href={`${basePath}/journal/${post.id}`} className="text-ink hover:text-belt-700">
                  {post.title}
                </Link>
                <p className="font-mono text-[10px] uppercase tracking-tag text-ink-soft">{post.slug}</p>
              </td>
              <td className="px-4 py-3 text-ink-soft">{post.category?.name ?? "—"}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center border px-2.5 py-1 font-mono text-[10px] uppercase tracking-tag ${
                    post.published ? "border-belt-500/40 text-belt-700" : "border-line text-ink-soft"
                  }`}
                >
                  {post.published ? "Published" : "Draft"}
                </span>
              </td>
              <td className="px-4 py-3 text-ink-soft">{post.publishedAt?.toLocaleDateString() ?? "—"}</td>
              <td className="px-4 py-3 text-ink-soft">{post.updatedAt.toLocaleDateString()}</td>
              <td className="px-4 py-3 text-right">
                <Link href={`${basePath}/journal/${post.id}`} className="font-mono text-[10px] uppercase tracking-tag text-belt-700 hover:text-belt-500">
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </DataTable>
      </div>
    </div>
  );
}
