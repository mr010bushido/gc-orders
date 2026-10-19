import Link from "next/link";
import { connection } from "next/server";
import { requireOwner } from "../../../../lib/auth/require-owner";
import { getDb } from "../../../../lib/db";
import { ORDER_STATUSES, type OrderStatus } from "../../../../lib/db/schema/orders";
import { getOwnerOrderDetail, listOwnerOrders } from "../../../../lib/owner/orders-query";
import { OrdersList } from "./orders-list";

type Params = { status?: string; sort?: string; date?: string; cursor?: string; order?: string };
const labels: Record<string, string> = { active: "Active", all: "All", flagged: "Flagged", awaiting_quote: "Awaiting quote", awaiting_payment: "Awaiting payment", awaiting_verification: "Awaiting verification", confirmed: "Confirmed", completed: "Completed", expired: "Expired" };

export default async function OwnerOrdersPage({ searchParams = Promise.resolve({}) }: { searchParams?: Promise<Params> } = {}) {
  await requireOwner();
  await connection();
  const params = await searchParams;
  const status = labels[params.status ?? "active"] ? params.status ?? "active" : "active";
  const sort = params.sort === "desc" ? "desc" : "asc";
  const { orders, nextCursor } = await listOwnerOrders(getDb(), {
    status: status as OrderStatus | "active" | "all" | "flagged", sort,
    date: params.date, cursor: params.cursor,
  });
  const detail = params.order ? await getOwnerOrderDetail(getDb(), params.order) : null;
  const selectedId = params.order ? orders.find(row => row.reference === params.order)?.id : undefined;
  const base = new URLSearchParams();
  if (status !== "active") base.set("status", status);
  if (sort !== "asc") base.set("sort", sort);
  if (params.date) base.set("date", params.date);
  return <section>
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Owner dashboard</p><h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.02em]">Orders</h1></div>
      <p className="text-sm text-ink-soft">{orders.length}{nextCursor ? "+" : ""} orders</p>
    </header>
    <nav aria-label="Filter orders" className="mt-5 flex gap-2 overflow-x-auto pb-2">
      {Object.entries(labels).map(([value, label]) => {
        const query = new URLSearchParams(base); if (value !== "active") query.set("status", value); else query.delete("status"); query.delete("cursor");
        return <Link key={value} href={`/owner/orders${query.size ? `?${query}` : ""}`} aria-current={status === value ? "page" : undefined}
          className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-3 text-sm font-medium ${status === value ? "border-brand bg-selected text-ink" : "border-line-strong text-ink-soft hover:bg-selected"}`}>{label}</Link>;
      })}
    </nav>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
      <form action="/owner/orders" className="flex min-h-11 items-center gap-2"><label htmlFor="event-date" className="text-sm font-medium">Event date</label><input id="event-date" name="date" type="date" defaultValue={params.date} className="h-11 rounded-sm border border-line-strong bg-surface px-2 text-base"/><input type="hidden" name="status" value={status}/><button className="min-h-11 rounded-md border border-ink px-3 text-sm font-semibold">Apply</button>{params.date && <Link className="inline-flex min-h-11 items-center px-2 text-sm text-brand-ink" href="/owner/orders">Clear</Link>}</form>
      <Link href={`/owner/orders?${new URLSearchParams({ ...(status !== "active" ? { status } : {}), ...(params.date ? { date: params.date } : {}), sort: sort === "asc" ? "desc" : "asc" })}`} className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-brand-ink">Event date {sort === "asc" ? "↑" : "↓"}</Link>
    </div>
    <OrdersList orders={orders} selectedId={selectedId} detail={detail}/>
    {nextCursor && <Link className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center rounded-md border border-ink bg-transparent font-semibold text-ink" href={`/owner/orders?${new URLSearchParams({ ...(status !== "active" ? { status } : {}), ...(params.date ? { date: params.date } : {}), ...(sort !== "asc" ? { sort } : {}), cursor: nextCursor })}`}>Load more</Link>}
    {params.order && !detail && <p role="status" className="mt-4 text-sm text-ink-soft">That order could not be found.</p>}
    <span className="sr-only">Supported statuses: {ORDER_STATUSES.join(", ")}</span>
  </section>;
}
