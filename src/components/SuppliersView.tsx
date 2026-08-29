import { prisma } from "@/lib/prisma";
import { DataTable } from "@/components/DataTable";
import { SupplierFormModal } from "@/components/SupplierFormModal";

export async function SuppliersView() {
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl text-ink">Suppliers</h1>
        <SupplierFormModal />
      </div>

      <div className="mt-6">
        <DataTable
          headers={["Name", "Email", "Phone", "Address", ""]}
          isEmpty={suppliers.length === 0}
          emptyMessage="No suppliers yet — add one to start a purchase order."
        >
          {suppliers.map((s) => (
            <tr key={s.id} className="border-b border-line last:border-b-0 hover:bg-belt-50/50">
              <td className="px-4 py-3 text-ink">{s.name}</td>
              <td className="px-4 py-3 text-ink-soft">{s.contactEmail ?? "—"}</td>
              <td className="px-4 py-3 text-ink-soft">{s.contactPhone ?? "—"}</td>
              <td className="px-4 py-3 text-ink-soft">{s.address ?? "—"}</td>
              <td className="px-4 py-3 text-right">
                <SupplierFormModal supplier={s} />
              </td>
            </tr>
          ))}
        </DataTable>
      </div>
    </div>
  );
}
