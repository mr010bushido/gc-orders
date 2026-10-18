import { z } from "zod";
import { FULFILMENTS, TIME_WINDOWS } from "../db/schema/orders";

export const bookingRequestSchema = z.object({
  cake: z.object({
    flavour: z.string().trim().min(1),
    frosting: z.string().trim().min(1),
    tierSizes: z.array(z.number().int()).min(1),
    addons: z.array(z.string().trim().min(1)).default([]).transform(values => [...new Set(values)]),
  }).optional(),
  desserts: z.array(z.object({
    type: z.string().trim().min(1),
    quantity: z.number().int(),
    note: z.string().trim().max(500).optional(),
  })).max(10).default([]).superRefine((desserts, ctx) => {
    if (new Set(desserts.map(dessert => dessert.type)).size !== desserts.length) ctx.addIssue({ code: "custom", path: [0, "type"], message: "Duplicate dessert types" });
  }),
  honeypot: z.string().max(200).optional(),
  fulfilment: z.enum(FULFILMENTS),
  address: z.string().trim().max(500).optional(),
  eventDate: z.iso.date(),
  timeWindow: z.enum(TIME_WINDOWS),
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(1).max(50),
  email: z.email().max(254),
  designNotes: z.string().trim().max(2000).optional(),
  topperMessage: z.string().trim().max(200).optional(),
});

export type BookingRequest = z.input<typeof bookingRequestSchema>;

export const BOOKING_ERROR_CODES = [
  "REQUIRED", "PHONE_INVALID", "EMAIL_INVALID", "DATE_UNAVAILABLE", "DATE_TOO_SOON",
  "DESSERT_MIN_QUANTITY", "DELIVERY_ADDRESS_REQUIRED", "TOO_MANY_TIERS", "INACTIVE_ITEM",
  "EMPTY_BASKET", "INVALID_INPUT", "DUPLICATE_DESSERT",
] as const;

export type BookingErrorCode = (typeof BOOKING_ERROR_CODES)[number];
export type BookingField = "cake" | "flavour" | "frosting" | "tierSizes" | "addons" | "desserts"
  | "fulfilment" | "address" | "eventDate" | "timeWindow" | "name" | "phone" | "email"
  | "designNotes" | "topperMessage" | "_form";

export type BookingResponse =
  | { ok: true; reference: string; accessToken: string; total: number; deposit: number; lines: { label: string; amount: number; kind: string }[]; paymentInstructions: { airtelNumber: string | null; mtnNumber: string | null; quote: string } }
  | { ok: false; errors: Partial<Record<BookingField, BookingErrorCode>> };
