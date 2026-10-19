import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { requireOwner } from "../../../lib/auth/require-owner";
import { signOutOwner } from "../actions";
import { OwnerNav } from "./owner-nav";

// The route group keeps /owner/login outside this guarded shell. Owner screens use the sans font only.
export default async function OwnerLayout({ children }: { children: ReactNode }) {
  await requireOwner();
  return <div className="min-h-screen bg-bg font-sans text-ink">
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-2">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-soft">Giuseppe’s Cakes · Owner</p>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <form action={signOutOwner}>
            <button type="submit" className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-brand-ink hover:underline">Sign out</button>
          </form>
        </div>
      </div>
      <OwnerNav />
    </header>
    <div className="mx-auto max-w-5xl px-5 py-8">{children}</div>
  </div>;
}
