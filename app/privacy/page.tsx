import Link from "next/link";
import { IMAGE_RETENTION_DAYS, NOTIFICATION_RETENTION_YEARS, ORDER_RETENTION_YEARS, PENDING_UPLOAD_RETENTION_HOURS } from "@/lib/retention/constants";

export default function PrivacyPage() {
  return <main className="mx-auto min-h-dvh max-w-2xl px-5 py-8 sm:px-8">
    <Link href="/" className="inline-flex min-h-11 items-center text-sm font-semibold text-ink">Giuseppe’s Cakes</Link>
    <article className="mt-8 space-y-6 text-base leading-7 text-ink">
      <header className="space-y-2"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Your order and your information</p><h1 className="font-display text-4xl leading-tight">Privacy, in plain language</h1></header>
      <p>We collect your name, phone number, email, delivery address when needed, cake and design notes, photos, and payment confirmation messages so Giuseppe’s Cakes can prepare and manage your order.</p>
      <section className="space-y-2"><h2 className="text-lg font-semibold">How we use it</h2><p>Your information is used only to handle your order. We never use it for targeted marketing, sell it, or share it beyond the people and providers needed to fulfil your order.</p></section>
      <section className="space-y-2"><h2 className="text-lg font-semibold">Who handles it</h2><p>The cake shop owner handles your booking. Our hosting providers keep the app and its database running; SMS and email providers deliver booking updates. They receive only what is needed for those services.</p></section>
      <section className="space-y-2"><h2 className="text-lg font-semibold">How long we keep it</h2><ul className="list-disc space-y-2 pl-6"><li>Reference photos are deleted after {IMAGE_RETENTION_DAYS} days from your event date.</li><li>Order details are anonymised after {ORDER_RETENTION_YEARS} years from your event date. We keep the information needed as a business record, but remove personal details.</li><li>We remove abandoned photo uploads after {PENDING_UPLOAD_RETENTION_HOURS} hours and notification delivery logs after {NOTIFICATION_RETENTION_YEARS} years.</li></ul></section>
      <section className="space-y-2"><h2 className="text-lg font-semibold">Ask us to erase your details</h2><p>Reply to your booking confirmation by SMS or email and ask Giuseppe’s Cakes to erase your personal data. We can erase data early for completed or expired orders; details needed to fulfil an active order are retained until it is complete.</p></section>
      <p className="border-t border-line pt-4 text-sm text-ink-soft">Your details are for this order only, never for targeted marketing.</p>
    </article>
  </main>;
}
