"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "../../../../components/ui/Button";
import { DatePicker } from "../../../../components/ui/DatePicker";
import { Input } from "../../../../components/ui/Input";
import { blockDate, closeSuggestedDate, keepDateOpen, reopenDate } from "./actions";

type Suggestion = { date: string; confirmedCount: number; capacity: number; awaitingCount: number };
type ClosedDate = { date: string; reason: "capacity" | "manual" | null; note: string };
type Props = { today: string; suggestions: Suggestion[]; closedDates: ClosedDate[] };

const dateLabel = (date: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
const ordersHref = (date: string) => `/owner/orders?date=${encodeURIComponent(date)}`;

export function DatesManager({ today, suggestions, closedDates }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const run = (action: (date: string) => Promise<{ ok: boolean; code?: string }>, date: string, success: string) => {
    startTransition(async () => {
      const result = await action(date);
      setMessage(result.ok ? success : result.code === "DATE_IN_PAST" ? "Choose today or a future date." : "That date changed. Refresh and try again.");
    });
  };

  const submitBlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedDate) {
      setMessage("Choose a date to block.");
      return;
    }
    startTransition(async () => {
      const result = await blockDate(selectedDate, note);
      if (!result.ok) {
        setMessage(result.code === "DATE_IN_PAST" ? "Choose today or a future date." : result.code === "NOTE_TOO_LONG" ? "Keep the note to 200 characters or fewer." : "That date could not be blocked.");
        return;
      }
      setMessage(result.existingOrderCount
        ? `Date blocked. ${result.existingOrderCount} existing ${result.existingOrderCount === 1 ? "order stays" : "orders stay"} as they are.`
        : "Date blocked.");
      setSelectedDate(null);
      setNote("");
    });
  };

  return <div className="mt-6 space-y-8">
    <section aria-labelledby="suggestions-heading">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="suggestions-heading" className="text-lg font-semibold">Capacity suggestions</h2>
        <span className="text-sm text-ink-soft">Capacity reached</span>
      </div>
      {suggestions.length ? <ul className="mt-3 space-y-3">
        {suggestions.map(({ date, confirmedCount, capacity, awaitingCount }) => <li key={date} className="rounded-md border border-line bg-surface p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link href={ordersHref(date)} className="font-semibold text-ink underline decoration-line-strong underline-offset-4">{dateLabel(date)}</Link>
              <p className="mt-1 text-sm text-ink-soft">{confirmedCount} confirmed, {awaitingCount} awaiting · capacity {capacity}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" disabled={isPending} onClick={() => run(closeSuggestedDate, date, "Date closed to new bookings.")}>Close date</Button>
              <Button variant="ghost" disabled={isPending} onClick={() => run(keepDateOpen, date, "Date kept open.")}>Keep open</Button>
            </div>
          </div>
        </li>)}
      </ul> : <p className="mt-3 rounded-md border border-line bg-surface p-4 text-sm text-ink-soft">No dates have reached capacity.</p>}
    </section>

    <section aria-labelledby="closed-heading">
      <h2 id="closed-heading" className="text-lg font-semibold">Closed dates</h2>
      {closedDates.length ? <ul className="mt-3 space-y-3">
        {closedDates.map(({ date, reason, note: closedNote }) => <li key={date} className="rounded-md border border-line bg-surface p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link href={ordersHref(date)} className="font-semibold text-ink underline decoration-line-strong underline-offset-4">{dateLabel(date)}</Link>
              <p className="mt-1 text-sm text-ink-soft">{reason === "capacity" ? "Capacity" : "Manual block"}{closedNote ? ` · ${closedNote}` : ""}</p>
            </div>
            <Button variant="ghost" disabled={isPending} onClick={() => run(reopenDate, date, "Date reopened to bookings.")}>Reopen</Button>
          </div>
        </li>)}
      </ul> : <p className="mt-3 rounded-md border border-line bg-surface p-4 text-sm text-ink-soft">No dates are closed.</p>}
    </section>

    <section aria-labelledby="block-heading">
      <h2 id="block-heading" className="text-lg font-semibold">Block a date</h2>
      <form onSubmit={submitBlock} className="mt-3 max-w-xl space-y-4 rounded-md border border-line bg-surface p-4">
        <DatePicker value={selectedDate} onChange={setSelectedDate} today={today} minDate={today} closedDates={closedDates.map(item => item.date)} monthFont="sans" label="Choose a date to block" />
        <Input label="Note (optional)" value={note} onChange={event => setNote(event.target.value)} maxLength={200} helper={`${note.length}/200 characters`} />
        <Button type="submit" disabled={isPending || !selectedDate}>Block date</Button>
      </form>
    </section>
    <p aria-live="polite" role="status" className="min-h-5 text-sm text-ink-soft">{message}</p>
  </div>;
}
