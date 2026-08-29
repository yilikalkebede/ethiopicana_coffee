/**
 * Generic table shell (spec §45's DataTable). Deliberately takes
 * already-built <tr> elements as `children` rather than a `render`
 * function per column: the callers (ProductListView, InventoryView) are
 * server components, and a function prop can't cross the server→client
 * boundary (only serializable values/elements can) — pre-built JSX rows
 * can. This also means DataTable itself needs no "use client" directive
 * and no state of its own; it works from either a server or client parent.
 */
export function DataTable({
  headers,
  children,
  isEmpty,
  emptyMessage = "Nothing here yet.",
}: {
  headers: string[];
  children: React.ReactNode;
  isEmpty: boolean;
  emptyMessage?: string;
}) {
  if (isEmpty) {
    return (
      <div className="border border-line px-6 py-16 text-center">
        <p className="font-body text-sm text-ink-soft">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-line">
      <table className="w-full text-left font-body text-sm">
        <thead className="border-b border-line bg-belt-50">
          <tr>
            {headers.map((h) => (
              <th key={h} className="whitespace-nowrap px-4 py-3 font-mono text-[10px] uppercase tracking-tag text-ink-soft">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
