import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-28 text-center">
      <p className="specimen-tag">404</p>
      <h1 className="mt-6 text-4xl text-ink">This lot isn&apos;t on the map.</h1>
      <p className="mt-4 font-body text-ink-soft">
        The page you&apos;re looking for doesn&apos;t exist, or has moved.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link href="/shop" className="btn-primary">
          Shop Coffee
        </Link>
        <Link href="/" className="btn-secondary">
          Back home
        </Link>
      </div>
    </section>
  );
}
