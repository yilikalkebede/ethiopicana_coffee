import { notFound } from "next/navigation";
import Link from "next/link";
import { GiftStatusPoller } from "@/components/GiftStatusPoller";

export default function GiftSuccessPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const sessionId = typeof searchParams.session_id === "string" ? searchParams.session_id : undefined;
  if (!sessionId) notFound();

  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <p className="font-mono text-[11px] uppercase tracking-tag text-belt-700">Gift purchased</p>
      <h1 className="mt-2 text-4xl text-ink">Thank you.</h1>

      <div className="mt-8">
        <GiftStatusPoller sessionId={sessionId} />
      </div>

      <div className="mt-8 flex gap-4">
        <Link href="/gifts" className="btn-secondary !px-6 !py-2 text-xs">
          Send another
        </Link>
        <Link href="/shop" className="btn-secondary !px-6 !py-2 text-xs">
          Keep shopping
        </Link>
      </div>
    </section>
  );
}
