import Link from "next/link";
import type { OrderStatus } from "@/lib/db/schema/orders";

export const ORDER_STATUS_ID = "order-status";

const messages: Record<Exclude<OrderStatus, "expired">, string> = {
  awaiting_quote: "We’re reviewing your request and will contact you with a quote.",
  awaiting_payment: "Your booking is held while you pay the deposit.",
  awaiting_verification: "Your payment details are with the owner for verification.",
  confirmed: "Your booking is confirmed. We look forward to making it for you.",
  completed: "This order is complete. Thank you for choosing Giuseppe’s Cakes.",
};

/** `flagged`: the owner asked for more information. `received`: the customer has answered since. */
export function StatusMessage({ status, flagged = false, received = false }: { status: OrderStatus; flagged?: boolean; received?: boolean }) {
  const needsMore = flagged && !received && status === "awaiting_verification";
  const message = status === "expired" ? null
    : received && status === "awaiting_verification" ? "We’ve received your updated details. The owner will review them and be in touch."
    : needsMore ? "The owner needs a little more information. Please send the payment confirmation again."
    : messages[status];
  // Focusable so the form can move focus here after a successful send; the region is persistent so the refreshed text is announced.
  return <p id={ORDER_STATUS_ID} tabIndex={-1} role="status" aria-live="polite" className="leading-6 text-ink-soft outline-none">
    {message ?? <>This booking has expired. <Link href="/book" className="font-semibold text-brand-ink">Book again</Link> to choose a new date.</>}
  </p>;
}
