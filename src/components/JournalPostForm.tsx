"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export type JournalPostFormValues = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  published: boolean;
  categoryId: string;
};

export const EMPTY_JOURNAL_POST_FORM: JournalPostFormValues = {
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  published: false,
  categoryId: "",
};

const inputClass =
  "mt-1 w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink focus-visible:outline-belt-500";
const labelClass = "font-body text-xs text-ink-soft";

export function JournalPostForm({
  mode,
  basePath,
  initial,
  categories,
}: {
  mode: "create" | "edit";
  basePath: "/admin" | "/manager";
  initial?: JournalPostFormValues;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<JournalPostFormValues>(initial ?? EMPTY_JOURNAL_POST_FORM);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof JournalPostFormValues>(key: K, value: JournalPostFormValues[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function onTitleChange(value: string) {
    set("title", value);
    if (!slugTouched) set("slug", slugify(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      title: form.title,
      slug: form.slug,
      excerpt: form.excerpt || undefined,
      body: form.body,
      published: form.published,
      categoryId: form.categoryId || null,
    };

    const url = mode === "create" ? "/api/admin/journal" : `/api/admin/journal/${form.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }

    if (mode === "create") {
      const data = await res.json();
      router.push(`${basePath}/journal/${data.post.id}`);
    } else {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <label className={labelClass} htmlFor="jp-title">Title</label>
        <input
          id="jp-title"
          required
          value={form.title}
          onChange={(e) => onTitleChange(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="jp-slug">Slug</label>
        <input
          id="jp-slug"
          required
          value={form.slug}
          onChange={(e) => {
            setSlugTouched(true);
            set("slug", e.target.value);
          }}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="jp-category">Category (optional)</label>
        <select
          id="jp-category"
          value={form.categoryId}
          onChange={(e) => set("categoryId", e.target.value)}
          className={inputClass}
        >
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor="jp-excerpt">Excerpt (optional)</label>
        <textarea
          id="jp-excerpt"
          rows={2}
          value={form.excerpt}
          onChange={(e) => set("excerpt", e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="jp-body">Body</label>
        <textarea
          id="jp-body"
          required
          rows={14}
          value={form.body}
          onChange={(e) => set("body", e.target.value)}
          placeholder="Plain text — separate paragraphs with a blank line."
          className={inputClass}
        />
      </div>

      <label className="flex items-center gap-2 font-body text-sm text-ink">
        <input type="checkbox" checked={form.published} onChange={(e) => set("published", e.target.checked)} />
        Published
      </label>

      {error && (
        <p role="alert" className="font-body text-sm text-rust">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="font-body text-sm text-belt-700">Saved.</p>
      )}

      <button type="submit" disabled={submitting} className="btn-primary !px-6 !py-3 disabled:opacity-50">
        {submitting ? "Saving…" : mode === "create" ? "Create post" : "Save changes"}
      </button>
    </form>
  );
}
