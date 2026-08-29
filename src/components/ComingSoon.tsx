export function ComingSoon({ title, phase, note }: { title: string; phase: string; note: string }) {
  return (
    <section className="mx-auto max-w-2xl px-6 py-28 text-center">
      <span className="specimen-tag mx-auto w-fit">{phase}</span>
      <h1 className="mt-6 text-4xl text-ink">{title}</h1>
      <p className="mt-4 font-body text-sm text-ink-soft">{note}</p>
    </section>
  );
}
