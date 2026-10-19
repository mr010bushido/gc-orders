"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Later owner items (pricing, settings, ...) add a row here.
const items = [{ href: "/owner/orders", label: "Orders" }];

export function OwnerNav() {
  const pathname = usePathname();
  return <nav aria-label="Owner" className="mx-auto max-w-5xl px-5">
    <ul className="flex gap-1 overflow-x-auto">
      {items.map(({ href, label }) => {
        const current = pathname === href || pathname.startsWith(`${href}/`);
        return <li key={href}>
          <Link
            href={href}
            aria-current={current ? "page" : undefined}
            className={`inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-semibold ${current ? "border-brand text-ink" : "border-transparent text-ink-soft hover:text-ink"}`}
          >{label}</Link>
        </li>;
      })}
    </ul>
  </nav>;
}
