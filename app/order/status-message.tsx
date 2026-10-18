import type { OrderStatus } from "@/lib/db/schema/orders";

const messages: Record<OrderStatus, string> = {
  awaiting_quote: "We’re reviewing your request and will contact you with a quote.",
  awaiting_payment: "Your booking is held while you pay the deposit.",
  awaiting_verification: "Your payment details are with the owner for verification.",
  confirmed: "Your booking is confirmed. We look forward to making it for you.",
  completed: "This order is complete. Thank you for choosing Giuseppe’s Cakes.",
  expired: "This booking has expired. Please book again to choose a new date.",
};

export function StatusMessage({ status, flagged = false }: { status: OrderStatus; flagged?: boolean }) {
  const message = flagged && status === "awaiting_verification"
    ? "The owner needs a little more information. Please send the payment confirmation again."
    : messages[status];
  return <p role="status" aria-live="polite" className="leading-6 text-ink-soft">{message}</p>;
}
