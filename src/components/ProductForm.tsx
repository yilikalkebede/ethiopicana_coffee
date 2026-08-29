"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROAST_LEVELS = ["light", "medium", "medium-dark", "dark"];
const BREW_METHOD_OPTIONS = ["drip", "pour-over", "french-press", "espresso", "aeropress", "cold-brew"];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export type ProductFormValues = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  sku: string;
  categoryId: string;
  price: string;
  compareAtPrice: string;
  cost: string;
  active: boolean;
  featured: boolean;
  subscriptionEligible: boolean;
  origin: string;
  region: string;
  farmOrProducer: string;
  elevationMeters: string;
  processingMethod: string;
  roastLevel: string;
  flavorNotes: string;
  brewMethods: string[];
  latitude: string;
  longitude: string;
};

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  name: "",
  slug: "",
  description: "",
  shortDescription: "",
  sku: "",
  categoryId: "",
  price: "",
  compareAtPrice: "",
  cost: "",
  active: true,
  featured: false,
  subscriptionEligible: true,
  origin: "",
  region: "",
  farmOrProducer: "",
  elevationMeters: "",
  processingMethod: "",
  roastLevel: "",
  flavorNotes: "",
  brewMethods: [],
  latitude: "",
  longitude: "",
};

const inputClass =
  "mt-1 w-full border border-line bg-paper px-3 py-2 font-body text-sm text-ink focus-visible:outline-belt-500";
const labelClass = "font-body text-xs text-ink-soft";

export function ProductForm({
  mode,
  basePath,
  categories,
  initial,
}: {
  mode: "create" | "edit";
  basePath: "/admin" | "/manager";
  categories: { id: string; name: string }[];
  initial?: ProductFormValues;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ProductFormValues>(initial ?? EMPTY_PRODUCT_FORM);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function onNameChange(value: string) {
    set("name", value);
    if (!slugTouched) set("slug", slugify(value));
  }

  function toggleBrewMethod(method: string) {
    setForm((f) => ({
      ...f,
      brewMethods: f.brewMethods.includes(method) ? f.brewMethods.filter((m) => m !== method) : [...f.brewMethods, method],
    }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      name: form.name,
      slug: form.slug,
      description: form.description,
      shortDescription: form.shortDescription || undefined,
      sku: form.sku,
      categoryId: form.categoryId || undefined,
      price: Number(form.price),
      compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : undefined,
      cost: form.cost ? Number(form.cost) : undefined,
      active: form.active,
      featured: form.featured,
      subscriptionEligible: form.subscriptionEligible,
      origin: form.origin || undefined,
      region: form.region || undefined,
      farmOrProducer: form.farmOrProducer || undefined,
      elevationMeters: form.elevationMeters ? Number(form.elevationMeters) : undefined,
      processingMethod: form.processingMethod || undefined,
      roastLevel: form.roastLevel || undefined,
      flavorNotes: form.flavorNotes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      brewMethods: form.brewMethods,
      latitude: form.latitude ? Number(form.latitude) : undefined,
      longitude: form.longitude ? Number(form.longitude) : undefined,
    };

    const url = mode === "create" ? "/api/admin/products" : `/api/admin/products/${initial?.id}`;
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
      const data: { product: { id: string } } = await res.json();
      router.push(`${basePath}/products/${data.product.id}`);
    } else {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      <section>
        <h2 className="font-display text-lg text-ink">Basics</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="name">Name</label>
            <input id="name" required value={form.name} onChange={(e) => onNameChange(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="slug">Slug</label>
            <input
              id="slug"
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
            <label className={labelClass} htmlFor="sku">SKU</label>
            <input id="sku" required value={form.sku} onChange={(e) => set("sku", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="categoryId">Category</label>
            <select id="categoryId" value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)} className={inputClass}>
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="shortDescription">Short description</label>
            <input id="shortDescription" value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="description">Description</label>
            <textarea id="description" required rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} className={inputClass} />
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg text-ink">Pricing & flags</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass} htmlFor="price">Price ($)</label>
            <input id="price" type="number" step="0.01" min="0" required value={form.price} onChange={(e) => set("price", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="compareAtPrice">Compare-at price ($)</label>
            <input id="compareAtPrice" type="number" step="0.01" min="0" value={form.compareAtPrice} onChange={(e) => set("compareAtPrice", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="cost">Cost ($)</label>
            <input id="cost" type="number" step="0.01" min="0" value={form.cost} onChange={(e) => set("cost", e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-6">
          <label className="flex items-center gap-2 font-body text-sm text-ink">
            <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} /> Active
          </label>
          <label className="flex items-center gap-2 font-body text-sm text-ink">
            <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} /> Featured
          </label>
          <label className="flex items-center gap-2 font-body text-sm text-ink">
            <input type="checkbox" checked={form.subscriptionEligible} onChange={(e) => set("subscriptionEligible", e.target.checked)} /> Subscription eligible
          </label>
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg text-ink">Origin & tasting</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="origin">Origin (country)</label>
            <input id="origin" value={form.origin} onChange={(e) => set("origin", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="region">Region</label>
            <input id="region" value={form.region} onChange={(e) => set("region", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="farmOrProducer">Farm / producer</label>
            <input id="farmOrProducer" value={form.farmOrProducer} onChange={(e) => set("farmOrProducer", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="elevationMeters">Elevation (m)</label>
            <input id="elevationMeters" type="number" min="0" value={form.elevationMeters} onChange={(e) => set("elevationMeters", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="processingMethod">Processing method</label>
            <input id="processingMethod" value={form.processingMethod} onChange={(e) => set("processingMethod", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="roastLevel">Roast level</label>
            <select id="roastLevel" value={form.roastLevel} onChange={(e) => set("roastLevel", e.target.value)} className={inputClass}>
              <option value="">—</option>
              {ROAST_LEVELS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="flavorNotes">Flavor notes (comma-separated)</label>
            <input
              id="flavorNotes"
              value={form.flavorNotes}
              onChange={(e) => set("flavorNotes", e.target.value)}
              placeholder="jasmine, bergamot, peach"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="latitude">Latitude</label>
            <input id="latitude" type="number" step="0.01" value={form.latitude} onChange={(e) => set("latitude", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="longitude">Longitude</label>
            <input id="longitude" type="number" step="0.01" value={form.longitude} onChange={(e) => set("longitude", e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="mt-4">
          <p className={labelClass}>Brew methods</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {BREW_METHOD_OPTIONS.map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => toggleBrewMethod(method)}
                className={`tag-pill capitalize ${form.brewMethods.includes(method) ? "border-belt-500 text-belt-700" : ""}`}
              >
                {method.replace("-", " ")}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <p role="alert" className="font-body text-sm text-rust">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="font-body text-sm text-belt-700">
          Saved.
        </p>
      )}

      <button type="submit" disabled={submitting} className="btn-primary !px-8 !py-2.5 text-sm disabled:opacity-50">
        {submitting ? "Saving…" : mode === "create" ? "Create product" : "Save changes"}
      </button>
    </form>
  );
}
