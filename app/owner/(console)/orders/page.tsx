import { requireOwner } from "../../../../lib/auth/require-owner";

export default async function OwnerOrdersPage() {
  await requireOwner();
  return <section>
    <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em]">Orders</h1>
    <p className="mt-3 leading-6 text-ink-soft">Orders will appear here. They arrive in a later change.</p>
  </section>;
}
