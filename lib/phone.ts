/** Returns a Zambian mobile number as `+260` and nine digits starting 5, 7 or 9, or null if it is not one. Used on client and server. */
export function normaliseZambianMobile(input: string): string | null {
  if (typeof input !== "string") return null;
  const compact = input.replace(/[\s\-()]/g, "");
  const match = /^(?:\+260|00260|260|0)?([579]\d{8})$/.exec(compact);
  return match ? `+260${match[1]}` : null;
}
