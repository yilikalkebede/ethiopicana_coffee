"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";

type Supplier = {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
};

const EMPTY_FORM = { name: "", contactEmail: "", contactPhone: "", address: "" };

export function SupplierFormModal({ supplier }: { supplier?: Supplier }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(
    supplier
      ? {
          name: supplier.name,
          contactEmail: supplier.contactEmail ?? "",
          contactPhone: supplier.contactPhone ?? "",
          address: supplier.address ?? "",
        }
      : EMPTY_FORM
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const url = supplier ? `/api/admin/suppliers/${supplier.id}` : "/api/admin/suppliers";
    const method = supplier ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setOpen(false);
    if (!supplier) setForm(EMPTY_FORM);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={supplier ? "font-mono text-[10px] uppercase tracking-tag text-belt-700 hover:text-belt-500" : "btn-primary !px-5 !py-2 text-sm"}
      >
        {supplier ? "Edit" : "+ New supplier"}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={supplier ? "Edit supplier" : "New supplier"}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="font-body text-xs text-ink-soft" htmlFor="supplier-name">Name</label>
            <input
              id="supplier-name"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink"
            />
          </div>
          <div>
            <label className="font-body text-xs text-ink-soft" htmlFor="supplier-email">Contact email</label>
            <input
              id="supplier-email"
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
              className="mt-1 w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink"
            />
          </div>
          <div>
            <label className="font-body text-xs text-ink-soft" htmlFor="supplier-phone">Contact phone</label>
            <input
              id="supplier-phone"
              value={form.contactPhone}
              onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
              className="mt-1 w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink"
            />
          </div>
          <div>
            <label className="font-body text-xs text-ink-soft" htmlFor="supplier-address">Address</label>
            <textarea
              id="supplier-address"
              rows={2}
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="mt-1 w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink"
            />
          </div>

          {error && (
            <p role="alert" className="font-body text-sm text-rust">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-50">
            {submitting ? "Saving…" : supplier ? "Save changes" : "Create supplier"}
          </button>
        </form>
      </Modal>
    </>
  );
}
