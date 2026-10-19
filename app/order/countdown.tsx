"use client";

import { useEffect, useState } from "react";

export function ExpiryCountdown({ deadline, payBy }: { deadline: string; payBy?: string }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setLeft(Math.max(0, Date.parse(deadline) - Date.now()));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  const hours = Math.floor((left ?? 0) / 3_600_000);
  const minutes = Math.floor((left ?? 0) % 3_600_000 / 60_000);
  const seconds = Math.floor((left ?? 0) % 60_000 / 1000);
  return <p aria-live="off" className="text-sm text-ink-soft">Time to pay: <span className="tabular-nums">{left === null ? "Calculating…" : `${hours}h ${minutes}m ${seconds}s`}</span>{payBy && <span className="block">Pay by {payBy} (Lusaka time)</span>}</p>;
}
