import { getCatalogue } from "@/lib/catalogue/catalogue";
import { toPricingRules } from "@/lib/catalogue/pricing-rules";
import { getClosedDates } from "@/lib/availability/availability";
import { earliestEventDate } from "@/lib/basket-pricing";
import { getDb } from "@/lib/db";
import { connection } from "next/server";
import { BookingWizard } from "./wizard";

export default async function BookPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  await connection();
  const [{ step }, catalogue] = await Promise.all([searchParams, getCatalogue(getDb())]);
  const rules = toPricingRules(catalogue);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lusaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const minDate = earliestEventDate(false, new Date(), rules);
  const maxDate = new Date(Date.parse(`${minDate}T00:00:00Z`) + 366 * 86400000).toISOString().slice(0, 10);
  const closedDates = await getClosedDates(getDb(), minDate, maxDate);
  return <BookingWizard catalogue={catalogue} rules={rules} today={today} closedDates={closedDates} initialStep={Math.max(0, Math.min(3, (Number(step ?? 1) || 1) - 1))} />;
}
