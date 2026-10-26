import { connection } from "next/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { getCatalogue } from "@/lib/catalogue/catalogue";
import { formatEventDate, formatKwacha } from "@/components/ui/format";
import { effectiveStatus, findOrderByToken, getTimeline } from "@/lib/orders/orders";
import { maskEmail, maskPhone } from "@/lib/orders/access";
import { StatusPill } from "@/design/components/StatusPill";
import { balanceDue } from "@/lib/orders/transitions";
import { PopForm } from "../pop-form";
import { ExpiryCountdown } from "../countdown";
import { StatusMessage } from "../status-message";
import { getQuoteRequest } from "@/lib/quotes/quotes";

const payByFormat = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Lusaka" });
const label = (status: string) => { const text = status.replaceAll("_", " "); return text[0].toUpperCase() + text.slice(1); };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ reference: string }>; searchParams: Promise<{ t?: string }> }) {
  await connection();
  const [{ reference }, { t }] = await Promise.all([params, searchParams]);
  const db = getDb();
  const detail = t ? await findOrderByToken(db, t) : null;
  if (!detail || detail.order.reference !== reference) notFound();
  const [timeline, catalogue, quoteRequest] = await Promise.all([getTimeline(db, detail.order.id), getCatalogue(db), getQuoteRequest(db, detail.order.id)]);
  const status = effectiveStatus(detail.order, new Date());
  const { flaggedAt, flagNote, paymentDueAt } = detail.order;
  // After a flag the customer may answer; once their newest POP is later than the flag, the ball is back with the owner.
  const answered = status === "awaiting_verification" && !!flaggedAt && !!detail.currentPop && detail.currentPop.submittedAt > flaggedAt;
  const canPay = status === "awaiting_payment" || (status === "awaiting_verification" && !!flaggedAt && !answered);
  const quotePending = status === "awaiting_quote";
  return <main className="mx-auto min-h-screen max-w-2xl px-5 py-8">
    <Link href="/" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-ink">Giuseppe’s Cakes</Link>
    <header className="mt-8 space-y-3"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Order tracking</p><h1 className="font-display text-4xl leading-tight">{detail.order.reference}</h1><StatusPill status={status} /><StatusMessage status={status} flagged={!!flaggedAt} received={answered} /></header>
    <section className="mt-7 space-y-3 rounded-md border border-line bg-surface p-4"><h2 className="font-semibold">Your order</h2><dl className="divide-y divide-line text-sm">
      <div className="flex justify-between gap-4 py-3"><dt>Customer</dt><dd className="text-right">{detail.order.customerName?.split(" ")[0] ?? "Customer"}</dd></div>
      <div className="flex justify-between gap-4 py-3"><dt>Mobile</dt><dd className="text-right">{maskPhone(detail.order.customerPhone)}</dd></div>
      <div className="flex justify-between gap-4 py-3"><dt>Email</dt><dd className="text-right">{maskEmail(detail.order.customerEmail)}</dd></div>
      <div className="flex justify-between gap-4 py-3"><dt>Event</dt><dd className="text-right">{formatEventDate(detail.order.eventDate)} · <span className="capitalize">{detail.order.timeWindow}</span></dd></div>
      <div className="flex justify-between gap-4 py-3"><dt>Fulfilment</dt><dd className="text-right capitalize">{detail.order.fulfilment}</dd></div>
      {quoteRequest && <div className="space-y-1 py-3"><dt className="font-medium">Quote request · {quoteRequest.kind.replaceAll("_", " ")}</dt><dd className="whitespace-pre-wrap">{quoteRequest.description}</dd></div>}
      {detail.lines.map(line => <div key={line.id} className="flex justify-between gap-4 py-3"><dt>{line.quantity > 1 ? `${line.quantity} × ` : ""}{line.label}</dt>{!quotePending && <dd className="shrink-0 tabular-nums">{formatKwacha(line.amount)}</dd>}</div>)}
      {quotePending
        ? <div className="flex justify-between gap-4 py-3 font-semibold"><dt>Total</dt><dd>Quote pending</dd></div>
        : <>
          <div className="-mx-4 flex justify-between gap-4 bg-gold-wash px-4 py-3 font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatKwacha(detail.order.total)}</dd></div>
          <div className="flex justify-between gap-4 py-3"><dt>Deposit amount</dt><dd className="tabular-nums">{formatKwacha(detail.order.deposit)}</dd></div>
          <div className="flex justify-between gap-4 py-3"><dt>Balance due</dt><dd className="tabular-nums">{formatKwacha(balanceDue(detail.order))}</dd></div>
        </>}
    </dl></section>
    <section className="mt-6 space-y-3"><h2 className="font-semibold">Order updates</h2><ol className="space-y-3 border-l border-line pl-4">{timeline.map(event => <li key={event.id} className="text-sm"><p className="font-medium">{label(event.toStatus)}</p><time className="text-ink-soft">{new Intl.DateTimeFormat("en-ZM", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lusaka" }).format(event.at)}</time></li>)}{status === "expired" && detail.order.status !== "expired" && <li className="text-sm">Payment deadline passed</li>}</ol></section>
    {canPay && <section className="mt-6 space-y-4 rounded-md border border-line bg-surface p-4"><h2 className="font-semibold">Pay your 50% deposit</h2><p className="text-sm">Send {formatKwacha(detail.order.deposit)} and quote <strong>{detail.order.reference}</strong>.</p>{catalogue.settings.airtel_number && <p className="text-sm">Airtel Money: <strong>{catalogue.settings.airtel_number}</strong></p>}{catalogue.settings.mtn_number && <p className="text-sm">MTN MoMo: <strong>{catalogue.settings.mtn_number}</strong></p>}{status === "awaiting_payment" && paymentDueAt && <ExpiryCountdown deadline={paymentDueAt.toISOString()} payBy={payByFormat.format(paymentDueAt)} />}{status === "awaiting_verification" && flagNote && <p className="rounded-md bg-warn-bg p-3 text-sm text-warn-ink">The owner needs a little more information: {flagNote}</p>}<PopForm token={t!} /></section>}
    {status === "confirmed" && detail.order.fulfilment === "pickup" && catalogue.settings.pickup_map_url && <a className="mt-6 inline-flex min-h-11 items-center font-semibold text-brand-ink" href={catalogue.settings.pickup_map_url} target="_blank" rel="noreferrer">Open pickup location ↗</a>}
  </main>;
}
