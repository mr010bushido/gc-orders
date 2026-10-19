"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { OwnerOrderRow } from "../../../../lib/owner/orders-query";
import { formatEventDate } from "../../../../components/ui/format";
import { OrderCard } from "../../../../components/ui/OrderCard";
import { markSeen } from "./actions";
import { OrderDetailSheet } from "./order-detail-sheet";
import type { OwnerOrderDetail } from "../../../../lib/owner/orders-query";

export function OrdersList({ orders, selectedId, detail }: { orders: OwnerOrderRow[]; selectedId?: string; detail: OwnerOrderDetail | null }) {
  const router = useRouter();
  const search = useSearchParams();
  return <>
  {!orders.length ? <p className="mt-6 rounded-md border border-line bg-surface p-4 text-sm text-ink-soft">No orders match these filters.</p> : <ul className="mt-4 divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
    {orders.map(order => <li key={order.id}>
      <div className="relative">
        {order.ownerSeenAt === null && <span className="absolute right-4 top-[3.65rem] z-10 rounded-full bg-gold-wash px-2 py-1 text-xs font-semibold text-gold-ink">New</span>}
        <OrderCard reference={order.reference} date={formatEventDate(order.eventDate)} status={order.status}
          customer={order.customerName ?? "Customer"} summary={order.summary} fulfilment={order.fulfilment}
          total={order.total} selected={selectedId === order.id} onSelect={() => {
            const params = new URLSearchParams(search.toString()); params.set("order", order.reference);
            router.push(`/owner/orders?${params}`);
            if (order.ownerSeenAt === null) void markSeen(order.id).then(() => router.refresh());
          }}/>
      </div>
    </li>)}
  </ul>}
  <OrderDetailSheet order={detail} onClose={() => { const params = new URLSearchParams(search.toString()); params.delete("order"); router.push(`/owner/orders${params.size ? `?${params}` : ""}`); }}/>
  </>;
}
