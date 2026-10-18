import { z } from "zod";
import { FULFILMENTS, TIME_WINDOWS } from "../db/schema/orders";

export const bookingRequestSchema = z.object({
  cake: z.object({
    flavour: z.string(),
    frosting: z.string(),
    tierSizes: z.array(z.number().int()),
    addons: z.array(z.string()),
  }).optional(),
  desserts: z.array(z.object({
    type: z.string(),
    quantity: z.number().int(),
    note: z.string().optional(),
  })),
  fulfilment: z.enum(FULFILMENTS),
  address: z.string().optional(),
  eventDate: z.string(),
  timeWindow: z.enum(TIME_WINDOWS),
  name: z.string(),
  phone: z.string(),
  email: z.string(),
  designNotes: z.string().optional(),
  topperMessage: z.string().optional(),
  honeypot: z.string().optional(),
});

export type BookingRequest = z.input<typeof bookingRequestSchema>;

export const BOOKING_ERROR_CODES = [
  "REQUIRED", "PHONE_INVALID", "EMAIL_INVALID", "DATE_UNAVAILABLE", "DATE_TOO_SOON",
  "DESSERT_MIN_QUANTITY", "DELIVERY_ADDRESS_REQUIRED", "TOO_MANY_TIERS", "INACTIVE_ITEM",
  "EMPTY_BASKET", "RATE_LIMITED", "INVALID_INPUT",
] as const;

export type BookingErrorCode = (typeof BOOKING_ERROR_CODES)[number];
export type BookingField = "cake" | "flavour" | "frosting" | "tierSizes" | "addons" | "desserts"
  | "fulfilment" | "address" | "eventDate" | "timeWindow" | "name" | "phone" | "email"
  | "designNotes" | "topperMessage" | "_form";

export type BookingResponse =
  | { ok: true; reference: string; accessToken: string; total: number; deposit: number; paymentInstructions: { airtelNumber: string | null; mtnNumber: string | null; quote: string } }
  | { ok: false; errors: Partial<Record<BookingField, BookingErrorCode>> };
