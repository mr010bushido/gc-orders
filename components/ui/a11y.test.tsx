import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { StatusPill } from '../StatusPill';
import { AddonList } from './AddonList';
import { Banner } from './Banner';
import { Button } from './Button';
import { DatePicker } from './DatePicker';
import { Input } from './Input';
import { OrderCard } from './OrderCard';
import { RadioCardGroup } from './RadioCardGroup';
import { Sheet } from './Sheet';
import { Stepper } from './Stepper';
import { SummaryCard } from './SummaryCard';

const noop = () => {};
const order = {
  reference: 'CAKE-2026-0042', date: 'Sat 19 Sep', status: 'confirmed' as const,
  customer: 'Mwila Banda', summary: 'Chocolate, 2 tiers', fulfilment: 'Delivery', total: 2650,
};

// jsdom cannot compute colour, so contrast comes from the tokens (checked visually in the gallery).
const noContrast = { rules: { 'color-contrast': { enabled: false } } };

const cases: Record<string, ReactElement> = {
  'Button': <><Button>Book</Button><Button variant="ghost">Back</Button><Button disabled>Pay</Button><Button href="/book">Link</Button></>,
  'Input': <><Input label="Name" helper="As on your ID" /><Input label="Phone" error="Enter a Zambian mobile number" /></>,
  'RadioCardGroup': <RadioCardGroup legend="Fulfilment" value="pickup" onChange={noop}
    options={[{ value: 'delivery', label: 'Delivery' }, { value: 'pickup', label: 'Pickup', description: 'From the shop' }]} />,
  'AddonList': <AddonList legend="Add-ons" selected={new Set(['a'])} onChange={noop}
    addons={[{ key: 'a', label: 'Topper', price: 150 }, { key: 'b', label: 'Candles', price: 50 }]} />,
  'Stepper': <Stepper steps={['Cake', 'Details', 'Date', 'Review']} current={1} />,
  'Banner': <><Banner kind="info" lead="Note.">Info</Banner><Banner kind="warning" lead="Rush.">Fee</Banner><Banner kind="success" lead="Paid.">Done</Banner></>,
  'SummaryCard': <SummaryCard lines={[{ label: 'Cake', amount: 2000 }, { label: 'Rush', amount: 400, kind: 'rush' }]} total={2400} deposit={1200} />,
  'DatePicker': <DatePicker value="2026-09-22" onChange={noop} today="2026-09-10" minDate="2026-09-11"
    closedDates={['2026-09-18']} isRush={(d) => d < '2026-09-15'} />,
  'DatePicker (sans)': <DatePicker value={null} onChange={noop} today="2026-09-10" monthFont="sans" />,
  'OrderCard': <div><OrderCard {...order} /><OrderCard {...order} selected onSelect={noop} /></div>,
  'StatusPill': <StatusPill status="awaiting_verification" />,
  'Sheet': <Sheet open onClose={noop} title="Order" reference="CAKE-2026-0042" status="new"
    actions={<><Button variant="ghost" block>Reject</Button><Button block>Verify</Button></>}><p>Body</p></Sheet>,
};

describe('axe', () => {
  it.each(Object.entries(cases))('%s has no violations', async (_, ui) => {
    const { container } = render(<main>{ui}</main>);
    const results = await axe(container, noContrast);
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  it('reports a real violation', async () => {
    const { container } = render(<main><input type="text" /></main>);
    const results = await axe(container, noContrast);
    expect(results.violations.map((v) => v.id)).toContain('label');
  });
});
