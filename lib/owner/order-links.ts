import { normaliseZambianMobile } from "../phone";

export function ownerContactLinks(phone: string | null | undefined, reference: string): { tel: string; whatsapp: string } | null {
  const number = phone ? normaliseZambianMobile(phone) : null;
  if (!number) return null;
  const digits = number.slice(1);
  return { tel: `tel:${number}`, whatsapp: `https://wa.me/${digits}?text=${encodeURIComponent(`Hello, regarding ${reference}.`)}` };
}
