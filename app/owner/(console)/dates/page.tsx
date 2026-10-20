import { DatesManager } from "./dates-manager";
import { todayInLusaka } from "../../../../lib/availability/availability";
import { requireOwner } from "../../../../lib/auth/require-owner";
import { getDb } from "../../../../lib/db";
import { getOwnerAvailability } from "../../../../lib/owner/availability-query";

export default async function OwnerDatesPage() {
  await requireOwner();
  const today = todayInLusaka();
  const availability = await getOwnerAvailability(getDb(), today);
  return <section>
    <header>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Owner dashboard</p>
      <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.02em]">Dates</h1>
    </header>
    <DatesManager today={today} {...availability} />
  </section>;
}
