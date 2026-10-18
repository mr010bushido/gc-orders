import Image from "next/image";
import logo from "@/design/logo.png";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/Button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col px-6 py-8 sm:px-12">
      <header className="flex items-center justify-between gap-4 border-b border-line pb-6">
        <Image src={logo} alt="Giuseppe's Cakes" sizes="160px" priority className="h-auto w-40 [mix-blend-mode:var(--gc-logo-blend)]" />
        <ThemeToggle />
      </header>
      <section className="flex flex-1 flex-col items-start justify-center gap-6 py-16">
        <h1 className="max-w-lg font-display text-[40px] leading-[44px] sm:text-[56px] sm:leading-[60px]">A cake for your occasion.</h1>
        <p className="max-w-lg leading-6 text-ink-soft">Choose your cake or desserts, arrange pickup or delivery, and celebrate.</p>
        <Button href="/book" className="sm:w-fit">Book a Cake</Button>
      </section>
    </main>
  );
}
