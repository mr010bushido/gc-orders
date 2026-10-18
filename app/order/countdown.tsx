"use client";

import { useEffect, useState } from "react";

export function ExpiryCountdown({ deadline }: { deadline: string }) {
  const [left, setLeft] = useState(() => Math.max(0, Date.parse(deadline) - Date.now()));
  useEffect(() => {
    const timer = setInterval(() => setLeft(Math.max(0, Date.parse(deadline) - Date.now())), 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  const hours = Math.floor(left / 3_600_000);
  const minutes = Math.floor(left % 3_600_000 / 60_000);
  const seconds = Math.floor(left % 60_000 / 1000);
  return <p aria-live="off" className="text-sm text-ink-soft">Time to pay: <span className="tabular-nums">{hours}h {minutes}m {seconds}s</span></p>;
}
