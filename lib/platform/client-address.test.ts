import { expect, it } from "vitest";
import { clientAddress } from "./client-address";

const request = (headers: Record<string, string>) => new Headers(headers);

it("prefers x-real-ip over any forwarding chain", () => {
  expect(clientAddress(request({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1, 192.0.2.9" }))).toBe("203.0.113.7");
});

it("ignores a spoofed left-most x-forwarded-for entry", () => {
  expect(clientAddress(request({ "x-forwarded-for": "1.2.3.4, 203.0.113.7" }))).toBe("203.0.113.7");
  expect(clientAddress(request({ "x-forwarded-for": "203.0.113.7" }))).toBe("203.0.113.7");
});

it("falls back to one shared bucket when no proxy header exists", () => {
  expect(clientAddress(request({}))).toBe("unknown");
  expect(clientAddress(request({ "x-real-ip": "  ", "x-forwarded-for": " , " }))).toBe("unknown");
});

it("bounds the key length", () => {
  expect(clientAddress(request({ "x-real-ip": "a".repeat(500) }))).toHaveLength(64);
});
