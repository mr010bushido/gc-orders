"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../../components/ui/Button";
import { Banner } from "../../../../components/ui/Banner";
import { Sheet } from "../../../../components/ui/Sheet";
import { formatEventDate, formatKwacha } from "../../../../components/ui/format";
import { ownerContactLinks } from "../../../../lib/owner/order-links";
import type { OwnerOrderDetail } from "../../../../lib/owner/orders-query";
import { markSeen } from "./actions";
import { clearFlag, completeOrder, flagOrder, recordBalancePaid, verifyOrder } from "./actions";
import type { BalanceMethod } from "../../../../lib/db/schema/orders";

function PlainText({ value }: { value: string }) {
  return <>{value.split(/([<>])/).map((part, index) => <span key={index}>{part}</span>)}</>;
}

function formatTimestamp(value: Date) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lusaka" }).format(value);
}

export function OrderDetailSheet({ order, images = [], onClose }: { order: OwnerOrderDetail | null; images?: { id: string; url: string; width: number; height: number }[]; onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<BalanceMethod>("cash");
  const [busy, setBusy] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const router = useRouter();
  useEffect(() => { if (order?.ownerSeenAt === null) void markSeen(order.id).then(() => router.refresh()); }, [order, router]);
  if (!order) return null;
  const links = ownerContactLinks(order.customerPhone, order.reference);
  const balance = order.total - order.deposit;
  const act = async (run: () => Promise<{ ok: boolean; message?: string; balanceUnpaid?: boolean }>) => {
    setBusy(true); setMessage("");
    try { const result = await run(); if (result.ok) { setMessage("Order updated."); router.refresh(); } else setMessage(result.message ?? "The order could not be updated."); }
    catch { setMessage("The order could not be updated. Refresh and try again."); }
    finally { setBusy(false); }
  };
  const submitFlag = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void act(() => flagOrder(order.id, note)); };
  const submitBalance = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void act(() => recordBalancePaid(order.id, method, note)); };
  const actions = order.status === "awaiting_verification" ? <>
    {order.flaggedAt ? <Button variant="ghost" disabled={busy} onClick={() => void act(() => clearFlag(order.id))}>Clear flag</Button> : <span />}
    <Button block disabled={busy} onClick={() => { if (window.confirm(`Verify ${formatKwacha(order.deposit)} deposit for ${order.reference}?`)) void act(() => verifyOrder(order.id)); }}>Verify {formatKwacha(order.deposit)} deposit</Button>
  </> : order.status === "confirmed" ? <>
    <Button variant="ghost" type="submit" form="balance-form" disabled={busy || Boolean(order.balancePaidAt)}>Balance paid</Button>
    <Button block disabled={busy} onClick={() => order.balancePaidAt ? void act(() => completeOrder(order.id)) : setConfirmComplete(true)}>Mark completed</Button>
  </> : undefined;
  return <Sheet open onClose={onClose} title={order.customerName ?? "Order"} reference={order.reference} status={order.status} flagged={Boolean(order.flaggedAt)} actions={confirmComplete ? undefined : actions}>
    <div className="space-y-5 py-4 text-sm">
      <section aria-label="Customer"><h3 className="font-semibold">Customer</h3><p>{order.customerName ?? "Personal details removed"}</p>
        {order.customerEmail && <p>{order.customerEmail}</p>}{order.customerPhone && <p>{order.customerPhone}</p>}
        {links && <div className="mt-2 flex gap-2"><Button variant="ghost" href={links.tel}>Call</Button><Button variant="ghost" href={links.whatsapp} target="_blank" rel="noreferrer">WhatsApp</Button></div>}
      </section>
      <section><h3 className="font-semibold">Event</h3><p>{formatEventDate(order.eventDate)} · {order.timeWindow}</p><p className="capitalize">{order.fulfilment}{order.fulfilment === "delivery" && order.deliveryAddress ? ` · ${order.deliveryAddress}` : ""}</p></section>
      <section><h3 className="font-semibold">Design notes</h3><p className="whitespace-pre-wrap"><PlainText value={order.designNotes || "None"}/></p><p>Topper: <span className="whitespace-pre-wrap"><PlainText value={order.topperMessage || "None"}/></span></p></section>
      {images.length > 0 && <section aria-label="Reference photos">
        <h3 className="font-semibold">Reference photos</h3>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image, index) => <a key={image.id} href={image.url} target="_blank" rel="noreferrer" className="block rounded-sm border border-line">
            {/* Signed URLs are used directly so image optimization cannot expose or cache them. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt={`Reference photo ${index + 1} for ${order.reference}`} width={image.width} height={image.height} className="aspect-square w-full rounded-sm object-cover" />
          </a>)}
        </div>
      </section>}
      <section><h3 className="font-semibold">Items</h3><ul className="divide-y divide-line">{order.lines.map(line => <li key={line.id} className="flex justify-between gap-3 py-2"><span>{line.quantity} × {line.label}</span><span className="tabular-nums">{formatKwacha(line.amount)}</span></li>)}</ul><dl className="mt-2 space-y-1"><div className="flex justify-between"><dt>Total</dt><dd>{formatKwacha(order.total)}</dd></div><div className="flex justify-between"><dt>Deposit</dt><dd>{formatKwacha(order.deposit)}</dd></div><div className="flex justify-between font-semibold"><dt>Balance</dt><dd>{formatKwacha(order.balancePaidAt ? 0 : balance)}</dd></div></dl></section>
      <section><h3 className="font-semibold">Proof of payment</h3>{order.submissions.length ? <ol className="space-y-3">{order.submissions.slice().reverse().map(pop => <li key={pop.id}><time className="text-xs text-ink-soft">{formatTimestamp(pop.submittedAt)}</time><p className="whitespace-pre-wrap rounded-sm border border-line bg-canvas p-3"><PlainText value={pop.text}/></p></li>)}</ol> : <p>No proof submitted.</p>}</section>
      <section><h3 className="font-semibold">Status history</h3><ol className="mt-2 space-y-2">{order.events.map(event => <li key={event.id} className="border-l-2 border-line pl-3"><p>{event.fromStatus ? `${event.fromStatus} → ` : "Created as "}{event.toStatus}</p><p className="text-xs text-ink-soft">{event.actor} · {formatTimestamp(event.at)}</p></li>)}</ol></section>
      {order.flagNote && <section><h3 className="font-semibold">Flag note</h3><p className="whitespace-pre-wrap"><PlainText value={order.flagNote}/></p></section>}
      {order.status === "awaiting_verification" && !order.flaggedAt && <form onSubmit={submitFlag} className="space-y-2"><label htmlFor="flag-note" className="font-semibold">Flag for review</label><textarea id="flag-note" required value={note} onChange={event => setNote(event.target.value)} rows={3} className="w-full rounded-sm border border-line-strong bg-surface p-3 text-base" placeholder="Why does this need review?"/><Button variant="ghost" type="submit" disabled={busy}>Flag order</Button></form>}
      {order.status === "confirmed" && <form id="balance-form" onSubmit={submitBalance} className="space-y-3 rounded-md border border-line p-3"><h3 className="font-semibold">Record balance paid</h3><label className="block">Method<select value={method} onChange={event => setMethod(event.target.value as BalanceMethod)} className="mt-1 h-11 w-full rounded-sm border border-line-strong bg-surface px-3">{["airtel", "mtn", "cash", "bank", "other"].map(item => <option key={item} value={item}>{item}</option>)}</select></label><label className="block">Note (optional)<textarea value={note} onChange={event => setNote(event.target.value)} rows={2} className="mt-1 w-full rounded-sm border border-line-strong bg-surface p-3"/></label><Button variant="ghost" type="submit" disabled={busy || Boolean(order.balancePaidAt)}>Record payment</Button></form>}
      {confirmComplete && <div role="alertdialog" aria-modal="true" aria-label="Balance remaining" className="rounded-md border border-warn-ink bg-warn-bg p-3"><Banner kind="warning" lead="Balance remaining.">{formatKwacha(order.balancePaidAt ? 0 : balance)} is still due. Complete this order anyway?</Banner><div className="mt-3 flex gap-2"><Button variant="ghost" onClick={() => setConfirmComplete(false)}>Cancel</Button><Button onClick={() => { setConfirmComplete(false); void act(() => completeOrder(order.id)); }}>Complete anyway</Button></div></div>}
      {message && <div role="status" aria-live="polite"><Banner kind={message === "Order updated." ? "success" : "warning"} lead={message}/></div>}
    </div>
  </Sheet>;
}
