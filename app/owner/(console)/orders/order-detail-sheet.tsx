"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Sheet } from "../../../../components/ui/Sheet";
import { formatEventDate, formatKwacha } from "../../../../components/ui/format";
import { ownerContactLinks } from "../../../../lib/owner/order-links";
import type { OwnerOrderDetail } from "../../../../lib/owner/orders-query";
import { markSeen } from "./actions";

export function OrderDetailSheet({ order, onClose }: { order: OwnerOrderDetail | null; onClose: () => void }) {
  const [message, setMessage] = useState("");
  useEffect(() => { if (order?.ownerSeenAt === null) void markSeen(order.id); }, [order]);
  if (!order) return null;
  const links = ownerContactLinks(order.customerPhone, order.reference);
  const balance = order.total - order.deposit;
  return <Sheet open onClose={onClose} title={order.customerName ?? "Order"} reference={order.reference} status={order.status}>
    <div className="space-y-5 py-4 text-sm">
      <section aria-label="Customer"><h3 className="font-semibold">Customer</h3><p>{order.customerName ?? "Personal details removed"}</p>
        {order.customerEmail && <p>{order.customerEmail}</p>}{order.customerPhone && <p>{order.customerPhone}</p>}
        {links && <div className="mt-2 flex gap-2"><Button variant="ghost" href={links.tel}>Call</Button><Button variant="ghost" href={links.whatsapp} target="_blank" rel="noreferrer">WhatsApp</Button></div>}
      </section>
      <section><h3 className="font-semibold">Event</h3><p>{formatEventDate(order.eventDate)} · {order.timeWindow}</p><p className="capitalize">{order.fulfilment}{order.fulfilment === "delivery" && order.deliveryAddress ? ` · ${order.deliveryAddress}` : ""}</p></section>
      <section><h3 className="font-semibold">Design notes</h3><p className="whitespace-pre-wrap">{order.designNotes || "None"}</p><p>Topper: <span className="whitespace-pre-wrap">{order.topperMessage || "None"}</span></p></section>
      <section><h3 className="font-semibold">Items</h3><ul className="divide-y divide-line">{order.lines.map(line => <li key={line.id} className="flex justify-between gap-3 py-2"><span>{line.quantity} × {line.label}</span><span className="tabular-nums">{formatKwacha(line.amount)}</span></li>)}</ul><dl className="mt-2 space-y-1"><div className="flex justify-between"><dt>Total</dt><dd>{formatKwacha(order.total)}</dd></div><div className="flex justify-between"><dt>Deposit</dt><dd>{formatKwacha(order.deposit)}</dd></div><div className="flex justify-between font-semibold"><dt>Balance</dt><dd>{formatKwacha(order.balancePaidAt ? 0 : balance)}</dd></div></dl></section>
      <section><h3 className="font-semibold">Proof of payment</h3>{order.submissions.length ? <ol className="space-y-3">{order.submissions.slice().reverse().map(pop => <li key={pop.id}><time className="text-xs text-ink-soft">{pop.submittedAt.toLocaleString()}</time><p className="whitespace-pre-wrap rounded-sm border border-line bg-canvas p-3">{pop.text}</p></li>)}</ol> : <p>No proof submitted.</p>}</section>
      <section><h3 className="font-semibold">Status history</h3><ol className="mt-2 space-y-2">{order.events.map(event => <li key={event.id} className="border-l-2 border-line pl-3"><p>{event.fromStatus ? `${event.fromStatus} → ` : "Created as "}{event.toStatus}</p><p className="text-xs text-ink-soft">{event.actor} · {event.at.toLocaleString()}</p></li>)}</ol></section>
      {order.flagNote && <section><h3 className="font-semibold">Flag note</h3><p className="whitespace-pre-wrap">{order.flagNote}</p></section>}
      {message && <p role="status" aria-live="polite" className="rounded-sm border border-line p-3">{message}</p>}
    </div>
  </Sheet>;
}
