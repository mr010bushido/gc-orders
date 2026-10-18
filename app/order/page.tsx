import { FindBookingForm } from "./find-form";
import Link from "next/link";
import { connection } from "next/server";

export default async function FindBookingPage() {
  await connection();
  return <main className="mx-auto min-h-screen max-w-xl px-5 py-10">
    <Link href="/" className="text-sm font-semibold text-brand-ink">Giuseppe’s Cakes</Link>
    <section className="mt-10 space-y-6">
      <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Your order</p><h1 className="mt-2 font-display text-4xl leading-tight">Find my booking</h1></div>
      <p className="leading-6 text-ink-soft">Enter the reference and mobile number used when booking. If they match, we’ll text you a private order link.</p>
      <FindBookingForm />
    </section>
  </main>;
}
