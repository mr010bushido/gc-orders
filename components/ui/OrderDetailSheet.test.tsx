// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { OwnerOrderDetail } from "../../lib/owner/orders-query";
import { defaultCatalogue } from "../../lib/catalogue/catalogue";
import { toPricingRules } from "../../lib/catalogue/pricing-rules";
import { OrderDetailSheet } from "../../app/owner/(console)/orders/order-detail-sheet";

vi.mock("../../app/owner/(console)/orders/actions", () => ({ markSeen: vi.fn(), verifyOrder: vi.fn(), flagOrder: vi.fn(), clearFlag: vi.fn(), completeOrder: vi.fn(), recordBalancePaid: vi.fn(), sendQuoteAction: vi.fn(), declineQuoteAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const order = (status: OwnerOrderDetail["status"]): OwnerOrderDetail => ({
  id: "00000000-0000-4000-8000-000000000042", reference: "CAKE-2026-0042", status,
  fulfilment: "pickup", eventDate: "2026-11-30", timeWindow: "morning", customerName: "Mwila Banda",
  customerPhone: "+260977123456", customerEmail: "mwila@example.test", deliveryAddress: "",
  designNotes: "<img src=x onerror=alert(1)>", topperMessage: "Happy birthday", total: 2650, deposit: 1325,
  paymentDueAt: null, flaggedAt: null, flagNote: null, balancePaidAt: null, balanceMethod: null, balanceNote: null,
  ownerSeenAt: new Date(), anonymisedAt: null, privacyConsentAt: new Date(), createdAt: new Date(), summary: "Chocolate cake",
  lines: [{ id: "line-1", orderId: "00000000-0000-4000-8000-000000000042", position: 0, kind: "cake", label: "Chocolate cake", quantity: 1, unitAmount: 2650, amount: 2650, meta: {} }],
  submissions: [{ id: "pop-1", orderId: "00000000-0000-4000-8000-000000000042", text: "<script>alert('pop')</script>", submittedAt: new Date("2026-10-18T10:00:00Z") }],
  events: [{ id: "event-1", orderId: "00000000-0000-4000-8000-000000000042", fromStatus: null, toStatus: status, actor: "owner", at: new Date("2026-10-18T10:00:00Z") }],
  quoteRequest: null,
});

describe("OrderDetailSheet", () => {
  it("renders each supported order status in its shared pill", () => {
    for (const status of ["awaiting_quote", "awaiting_payment", "awaiting_verification", "confirmed", "completed", "expired"] as const) {
      const view = render(<OrderDetailSheet order={order(status)} onClose={() => {}} />);
      const label = status === "awaiting_quote" ? "Awaiting quote" : status === "awaiting_payment" ? "Awaiting payment" : status === "awaiting_verification" ? "Awaiting verification" : status[0].toUpperCase() + status.slice(1);
      expect(screen.getByText(label)).toBeTruthy();
      view.unmount();
    }
  });

  it("renders malicious proof and notes as literal text", () => {
    const { container } = render(<OrderDetailSheet order={order("awaiting_verification")} onClose={() => {}} />);
    expect(container.textContent).toContain("<script>alert('pop')</script>");
    expect(container.textContent).toContain("<img src=x onerror=alert(1)>");
    expect(document.querySelector("script")).toBeNull();
    expect(document.querySelector("img")).toBeNull();
  });

  it("shows a flag badge without changing the order status", () => {
    render(<OrderDetailSheet order={{ ...order("awaiting_verification"), flaggedAt: new Date() }} onClose={() => {}} />);
    expect(screen.getByText("Flagged")).toBeTruthy();
    expect(screen.getByText("Awaiting verification")).toBeTruthy();
  });

  it("shows quote details and a price preview for an awaiting quote", () => {
    const request = { ...order("awaiting_quote"), quoteRequest: { id: "quote-1", orderId: order("awaiting_quote").id, kind: "wedding_cake" as const, description: "Three tier floral cake" } };
    render(<OrderDetailSheet order={request} pricingRules={toPricingRules(defaultCatalogue())} onClose={() => {}} />);
    expect(screen.getByText("Quote request · wedding cake")).toBeTruthy();
    expect(screen.getByText("Three tier floral cake")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Quote line 1"), { target: { value: "Custom decoration" } });
    fireEvent.change(screen.getByLabelText("Quote amount 1"), { target: { value: "500" } });
    expect(screen.getByText("Deposit (50%)").parentElement?.textContent).toContain("K1,575");
    expect(screen.getByRole("button", { name: "Send quote" }).className).toContain("bg-brand");
    expect(screen.getByRole("button", { name: "Decline" }).className).toContain("border-ink");
  });

  it("makes completion the sole filled action for confirmed orders with unpaid or paid balance", () => {
    for (const balancePaidAt of [null, new Date("2026-10-18T11:00:00Z")]) {
      const view = render(<OrderDetailSheet order={{ ...order("confirmed"), balancePaidAt }} onClose={() => {}} />);
      const completed = screen.getByRole("button", { name: "Mark completed" });
      const balancePaid = screen.getByRole("button", { name: "Balance paid" });
      expect(completed.className).toContain("bg-brand");
      expect(balancePaid.className).toContain("border-ink");
      expect(balancePaid.className).not.toContain("bg-brand");
      expect(view.container.querySelectorAll("button.bg-brand")).toHaveLength(1);
      const footer = completed.parentElement as HTMLElement;
      expect(balancePaid.parentElement).toBe(footer);
      expect(footer.className).toContain("grid-cols-[1fr_2fr]");
      expect(Array.from(footer.children)).toEqual([balancePaid, completed]);

      if (!balancePaidAt) {
        fireEvent.click(completed);
        expect(screen.getByRole("alertdialog").textContent).toContain("is still due");
        expect(screen.getByRole("button", { name: "Complete anyway" }).className).toContain("bg-brand");
        expect(view.container.querySelectorAll("button.bg-brand")).toHaveLength(1);
      } else {
        expect(balancePaid).toHaveProperty("disabled", true);
      }
      view.unmount();
    }
  });
});
