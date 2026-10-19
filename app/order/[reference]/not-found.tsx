import Link from "next/link";
import { Button } from "@/components/ui/Button";

/** One page for every failure (wrong token, unknown reference, no token), so it reveals nothing about which orders exist. */
export default function OrderNotFound() {
  return <main className="mx-auto min-h-screen max-w-2xl px-5 py-8">
    <Link href="/" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-ink">Giuseppe’s Cakes</Link>
    <section className="mt-8 space-y-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Order tracking</p>
      <h1 className="font-display text-4xl leading-tight">We couldn’t open that order</h1>
      <p className="leading-6 text-ink-soft">The link may be old, incomplete or mistyped. Use your booking reference and mobile number and we’ll text you a fresh private link.</p>
      <Button href="/order">Find my booking</Button>
    </section>
  </main>;
}
