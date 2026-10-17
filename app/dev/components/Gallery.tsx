'use client';
import { useState, type ReactNode } from 'react';
import { StatusPill, type OrderStatus } from '@/components/StatusPill';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AddonList } from '@/components/ui/AddonList';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Input } from '@/components/ui/Input';
import { OrderCard } from '@/components/ui/OrderCard';
import { RadioCardGroup } from '@/components/ui/RadioCardGroup';
import { Sheet } from '@/components/ui/Sheet';
import { Stepper } from '@/components/ui/Stepper';
import { SummaryCard } from '@/components/ui/SummaryCard';

const addDays = (date: string, n: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

const STATUSES: OrderStatus[] = ['new', 'awaiting_payment', 'awaiting_verification', 'confirmed', 'completed', 'expired'];

const truck = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.5" /><circle cx="17" cy="17.5" r="1.5" />
  </svg>
);
const shop = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 10v10h16V10M3 10l2-6h14l2 6zM9 20v-6h6v6" />
  </svg>
);

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-line py-8">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">{title}</h2>
      {children}
    </section>
  );
}

export function Gallery({ today }: { today: string }) {
  const [fulfilment, setFulfilment] = useState<string | null>('delivery');
  const [addons, setAddons] = useState<Set<string>>(new Set(['topper']));
  const [date, setDate] = useState<string | null>(addDays(today, 6));
  const [ownerDate, setOwnerDate] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState('CAKE-2026-0042');
  const [sheetOpen, setSheetOpen] = useState(false);

  const minDate = addDays(today, 1);
  const rushUntil = addDays(today, 5);
  const closed = [addDays(today, 3), addDays(today, 9), addDays(today, 10)];

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-ink sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 pb-8">
        <h1 className="text-lg font-semibold">Component gallery</h1>
        <ThemeToggle />
      </header>

      <Section title="Button">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button>Book this cake</Button>
          <Button variant="ghost">Back</Button>
          <Button disabled>Disabled</Button>
          <Button href="#button">Link button</Button>
        </div>
      </Section>

      <Section title="Input">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Your name" placeholder="Mwila Banda" autoComplete="name" />
          <Input label="Phone" helper="We text your booking reference here" type="tel" defaultValue="0977 123 456" />
          <Input label="Phone (error)" type="tel" defaultValue="12345" error="Enter a Zambian mobile number" />
          <Input label="Disabled" disabled defaultValue="Locked" />
        </div>
      </Section>

      <Section title="Radio cards">
        <RadioCardGroup
          legend="How will you get your cake?"
          value={fulfilment}
          onChange={setFulfilment}
          options={[
            { value: 'delivery', label: 'Delivery', description: 'K150 anywhere in Lusaka', icon: truck },
            { value: 'pickup', label: 'Pickup', description: 'From the shop in Kabulonga', icon: shop },
          ]}
        />
      </Section>

      <Section title="Add-ons">
        <AddonList
          legend="Add-ons"
          selected={addons}
          onChange={setAddons}
          addons={[
            { key: 'topper', label: 'Name topper', price: 150 },
            { key: 'print', label: 'Edible photo print', description: 'Send the photo after booking', price: 250 },
            { key: 'candles', label: 'Candles', price: 50 },
          ]}
        />
      </Section>

      <Section title="Stepper">
        <Stepper steps={['Cake', 'Details', 'Date', 'Review']} current={1} />
        <Stepper steps={['Cake', 'Details', 'Review']} current={2} />
      </Section>

      <Section title="Banner">
        <Banner kind="info" lead="Deposit by mobile money.">Pay 50% by Airtel or MTN, then paste the SMS.</Banner>
        <Banner kind="warning" lead="Rush order.">Your date is less than 48 hours away, so a 20% fee applies to the cake.</Banner>
        <Banner kind="success" lead="Payment received.">We have confirmed your booking.</Banner>
      </Section>

      <Section title="Summary card">
        <SummaryCard
          lines={[
            { label: 'Chocolate, 10" + 8"', amount: 2000 },
            { label: 'Rush fee (20%)', amount: 400, kind: 'rush' },
            { label: 'Name topper', amount: 100 },
            { label: 'Delivery', amount: 150 },
          ]}
          total={2650}
          deposit={1325}
        />
      </Section>

      <Section title="Date picker">
        <div className="grid gap-6 lg:grid-cols-2">
          <DatePicker
            label="Event date"
            value={date}
            onChange={setDate}
            today={today}
            minDate={minDate}
            closedDates={closed}
            isRush={(d) => d < rushUntil}
          />
          <DatePicker label="Owner: block a date" value={ownerDate} onChange={setOwnerDate} today={today} closedDates={closed} monthFont="sans" />
        </div>
      </Section>

      <Section title="Status pills">
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((status) => <StatusPill key={status} status={status} />)}
        </div>
      </Section>

      <Section title="Order cards">
        <div className="divide-y divide-line overflow-hidden rounded-md border border-line">
          {[
            { reference: 'CAKE-2026-0042', status: 'awaiting_verification' as const, customer: 'Mwila Banda', summary: 'Chocolate, 2 tiers', fulfilment: 'Delivery', total: 2650 },
            { reference: 'CAKE-2026-0043', status: 'confirmed' as const, customer: 'Chanda Phiri', summary: 'Vanilla, 1 tier', fulfilment: 'Pickup', total: 1300 },
            { reference: 'CAKE-2026-0044', status: 'expired' as const, customer: 'Bwalya Mulenga', summary: 'Red velvet, 3 tiers with a very long description', fulfilment: 'Delivery', total: 5400 },
          ].map((order) => (
            <OrderCard key={order.reference} {...order} date="Sat 19 Sep" selected={order.reference === selectedOrder}
              onSelect={() => { setSelectedOrder(order.reference); setSheetOpen(true); }} />
          ))}
        </div>
      </Section>

      <Section title="Sheet">
        <div><Button variant="ghost" onClick={() => setSheetOpen(true)}>Open sheet</Button></div>
        <Sheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          reference={selectedOrder}
          title="Chocolate, 2 tiers"
          status="awaiting_verification"
          actions={<><Button variant="ghost" block onClick={() => setSheetOpen(false)}>Reject</Button><Button block onClick={() => setSheetOpen(false)}>Verify payment</Button></>}
        >
          <dl className="divide-y divide-line text-sm">
            {[['Customer', 'Mwila Banda'], ['Phone', '0977 123 456'], ['Event date', 'Sat 19 Sep'], ['Fulfilment', 'Delivery, Kabulonga'], ['Total', 'K2,650'], ['Deposit', 'K1,325'],
              ['POP', 'Airtel: Trans ID CI2609.1234.A56789 confirmed. You have sent K1,325.00 to GIUSEPPES CAKES.']].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-3">
                <dt className="text-ink-soft">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>
        </Sheet>
      </Section>
    </main>
  );
}
