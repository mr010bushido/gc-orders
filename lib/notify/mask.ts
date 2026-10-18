/** `+260977123456` → `+260 ••• ••• 456`; any other number keeps only its last three digits. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return /^\+260\d{9}$/.test(phone) ? `+260 ••• ••• ${digits.slice(-3)}` : `••• ${digits.slice(-3)}`;
}

/** Keeps the domain only: `mwila@example.com` → `•••@example.com`. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  return at < 0 ? "•••" : `•••${email.slice(at)}`;
}

/**
 * A short, non-secret description of a send failure for the log. Senders already keep credentials out of their errors;
 * this also strips anything shaped like a Twilio SID or token, a Resend key, an auth header, a phone number or an email.
 */
export function summariseError(error: unknown): string {
  const message = error instanceof Error ? error.message : "unknown error";
  return message
    .replace(/\b(Basic|Bearer)\s+\S+/gi, "$1 [redacted]")
    .replace(/\b(AC|SK|SM)?[0-9a-f]{32}\b/gi, "[redacted]")
    .replace(/\bre_\w+/g, "[redacted]")
    .replace(/[^\s@]+@[^\s@]+/g, "[email]")
    .replace(/\+?\d[\d ()-]{6,}\d/g, "[number]")
    .slice(0, 200) || "unknown error";
}
