import Image from "next/image";
import logo from "@/design/logo.png";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col px-6 py-8 sm:px-12">
      <header className="flex flex-wrap items-center justify-between gap-6 border-b border-line pb-8">
        <Image src={logo} alt="Giuseppe's Cakes" sizes="160px" priority className="h-auto w-40 [mix-blend-mode:var(--gc-logo-blend)]" />
        <ThemeToggle />
      </header>
      <section className="flex flex-1 flex-col justify-center gap-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Lusaka, Zambia</p>
        <h1 className="max-w-lg font-display text-[40px] leading-[44px] sm:text-[56px] sm:leading-[60px]">A cake for your occasion.</h1>
        <p className="max-w-lg leading-6 text-ink-soft">Online cake booking is coming soon. Choose your cake, arrange pickup or delivery, and celebrate.</p>
        <button type="button" popoverTarget="booking-preview" className="h-[52px] w-full rounded-md bg-brand px-6 font-semibold text-on-brand hover:bg-brand-hover sm:w-fit">About booking</button>
        <div id="booking-preview" popover="auto" className="m-auto max-w-sm rounded-lg border border-line bg-surface p-6 text-ink shadow-float">
          <p className="leading-6">Online booking is not open yet. This is a preview of the new Giuseppe&apos;s Cakes website.</p>
          <button type="button" popoverTarget="booking-preview" popoverTargetAction="hide" className="mt-6 h-[52px] w-full rounded-md border border-ink px-6 font-semibold">Close</button>
        </div>
      </section>
    </main>
  );
}
