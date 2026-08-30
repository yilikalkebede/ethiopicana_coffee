import Link from "next/link";

export default function NewsletterUnsubscribedPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const invalid = searchParams.status === "invalid";

  return (
    <section className="mx-auto max-w-2xl px-6 py-28 text-center">
      <h1 className="text-4xl text-ink">{invalid ? "That link isn't valid." : "You're unsubscribed."}</h1>
      <p className="mt-4 font-body text-ink-soft">
        {invalid
          ? "This unsubscribe link doesn't match an active subscription."
          : "You won't get any more newsletter email from us."}
      </p>
      <Link href="/" className="btn-primary mt-8 inline-block">
        Back home
      </Link>
    </section>
  );
}
