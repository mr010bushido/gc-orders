import { requireOwner } from "../../../../lib/auth/require-owner";
import { SettingsNotice } from "./settings-notice";

const sections = [
  { id: "prices", label: "Prices" },
  { id: "sizes", label: "Sizes" },
  { id: "rules", label: "Fees and rules" },
  { id: "windows", label: "Time windows" },
  { id: "payment", label: "Payment and contact" },
] as const;

export default async function SettingsPage() {
  await requireOwner();
  return <main>
    <h1 className="text-2xl font-semibold">Settings</h1>
    <p className="mt-2 max-w-2xl text-sm text-ink-soft">Manage the prices and booking details customers see when they book.</p>
    <nav aria-label="Settings sections" className="mt-5 overflow-x-auto border-b border-line">
      <ul className="flex min-w-max gap-1">
        {sections.map(({ id, label }) => <li key={id}>
          <a className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-ink-soft hover:text-ink" href={`#${id}`}>{label}</a>
        </li>)}
      </ul>
    </nav>
    <div className="mt-6 space-y-8">
      {sections.map(({ id, label }) => <section key={id} id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-4 space-y-3">
        <h2 id={`${id}-heading`} className="text-lg font-semibold">{label}</h2>
        <SettingsNotice />
      </section>)}
    </div>
  </main>;
}
