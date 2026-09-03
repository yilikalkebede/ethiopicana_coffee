import { notFound } from "next/navigation";
import Link from "next/link";
import { GiftCardStatusPoller } from "@/components/GiftCardStatusPoller";

export default function GiftCardSuccessPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const sessionId = typeof searchParams.session_id === "string" ? searchParams.session_id : undefined;
  const recipient = typeof searchParams.recipient === "string" ? searchParams.recipient : "the recipient";
  if (!sessionId) notFound();

  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <p className="font-mono text-[11px] uppercase tracking-tag text-belt-700">Gift card purchased</p>
      <h1 className="mt-2 text-4xl text-ink">Thank you.</h1>

      <div className="mt-8">
        <GiftCardStatusPoller sessionId={sessionId} recipientEmail={recipient} />
      </div>

      <div className="mt-8 flex gap-4">
        <Link href="/gift-cards" className="btn-secondary !px-6 !py-2 text-xs">
          Send another
        </Link>
        <Link href="/shop" className="btn-secondary !px-6 !py-2 text-xs">
          Keep shopping
        </Link>
      </div>
    </section>
  );
}
