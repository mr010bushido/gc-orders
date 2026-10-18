import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { buildCatalogue, defaultCatalogue } from '@/lib/catalogue/catalogue';
import { toPricingRules } from '@/lib/catalogue/pricing-rules';
import { earliestEventDate } from '@/lib/basket-pricing';
import { seedCatalogue } from '@/lib/catalogue/seed';
import { createTestDb } from '@/lib/db/test-db';
import { orders } from '@/lib/db/schema';
import { BookingWizard } from './wizard';

const mocks = vi.hoisted(() => ({ db: undefined as unknown, after: vi.fn(), actionMock: undefined as unknown }));
vi.mock('@/lib/db', () => ({ getDb: () => mocks.db }));
vi.mock('next/server', () => ({ after: mocks.after }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('./actions', async importOriginal => {
  const actual = await importOriginal<typeof import('./actions')>();
  return { createBookingAction: (...args: Parameters<typeof actual.createBookingAction>) => mocks.actionMock ? (mocks.actionMock as typeof actual.createBookingAction)(...args) : actual.createBookingAction(...args) };
});

const catalogue = buildCatalogue(defaultCatalogue(), false);
const rules = toPricingRules(catalogue);
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lusaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
let testDb: Awaited<ReturnType<typeof createTestDb>>;

beforeEach(async () => {
  testDb = await createTestDb();
  await seedCatalogue(testDb.db);
  mocks.db = testDb.db;
  mocks.after.mockReset();
  sessionStorage.clear();
});
afterEach(async () => { await testDb.close(); vi.resetModules(); });

it('restores a draft, validates the first step, focuses detail errors, then shows a real booking confirmation', async () => {
  const user = userEvent.setup();
  const draft = { cake: { flavour: '', frosting: '', tierSizes: [10], addons: [] }, desserts: [], fulfilment: 'pickup', address: '', eventDate: '', timeWindow: 'afternoon', name: '', phone: '', email: '', designNotes: '', topperMessage: '' };
  sessionStorage.setItem('gc-booking-draft-v1', JSON.stringify(draft));
  const { container } = render(<BookingWizard catalogue={catalogue} rules={rules} today={today()} closedDates={[]} initialStep={0} />);
  await screen.findByRole('heading', { name: 'Choose your treats' });
  expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(true);
  await user.selectOptions(screen.getByLabelText('Flavour'), 'vanilla');
  await user.selectOptions(screen.getByLabelText('Frosting'), 'american_buttercream');
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByRole('heading', { name: 'Cake details' })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByRole('heading', { name: 'Delivery and details' })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Review booking' }));
  expect(document.activeElement).toBe(container.querySelector('[data-error-focus]'));
  const eventDate = earliestEventDate(true, new Date(), rules);
  const calendarDay = container.querySelector<HTMLButtonElement>(`[data-date="${eventDate}"]`);
  expect(calendarDay).toBeTruthy();
  await user.click(calendarDay!);
  await user.click(screen.getByRole('button', { name: 'Review booking' }));
  expect(document.activeElement).toBe(screen.getByLabelText('Your name'));
  await user.type(screen.getByLabelText('Your name'), 'Mwila Banda');
  await user.type(screen.getByLabelText('Mobile number'), '0977 123 456');
  await user.type(screen.getByLabelText('Email address'), 'mwila@example.com');
  await user.click(screen.getByRole('button', { name: 'Review booking' }));
  const review = screen.getByRole('heading', { name: 'Review your booking' }).parentElement!;
  const displayedTotal = review.querySelector('.bg-gold-wash dd')?.textContent;

  const { createBookingAction } = await import('./actions');
  await user.click(screen.getByRole('button', { name: 'Submit booking' }));
  await screen.findByText(/^CAKE-\d{4}-\d{4}$/);
  const [stored] = await testDb.db.select().from(orders);
  expect(displayedTotal).toBe(`K${stored.total.toLocaleString('en-US')}`);
  expect(stored.status).toBe('awaiting_payment');
  expect(screen.getByText('Pay your 50% deposit')).toBeTruthy();
  expect(sessionStorage.getItem('gc-booking-draft-v1')).toBeNull();
  expect(mocks.after).toHaveBeenCalledOnce();
  expect(createBookingAction).toBeDefined();
});

it('keeps the dessert step disabled below the configured minimum', async () => {
  const user = userEvent.setup();
  render(<BookingWizard catalogue={catalogue} rules={rules} today={today()} closedDates={[]} initialStep={0} />);
  await screen.findByRole('heading', { name: 'Choose your treats' });
  await user.click(screen.getByRole('button', { name: '+ Add dessert type' }));
  await user.selectOptions(screen.getByLabelText('Dessert 1'), 'brownies');
  const quantity = screen.getByLabelText('Quantity') as HTMLInputElement;
  await user.clear(quantity);
  await user.type(quantity, '12');
  expect(screen.getByText('Minimum 30')).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(true);
  await user.clear(quantity);
  await user.type(quantity, '30');
  await user.type(screen.getByLabelText('Flavour note (optional)'), 'Vanilla drizzle');
  expect(JSON.parse(sessionStorage.getItem('gc-booking-draft-v1')!).desserts[0].note).toBe('Vanilla drizzle');
  expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(false);
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByText('Step 2 of 3 · Delivery and details')).toBeTruthy();
});

it('ignores a second submit while the action is pending', async () => {
  let finish!: (value: { ok: true; reference: string; accessToken: string; total: number; deposit: number; paymentInstructions: { airtelNumber: string; mtnNumber: string; quote: string } }) => void;
  const actionMock = vi.fn(() => new Promise<{ ok: true; reference: string; accessToken: string; total: number; deposit: number; paymentInstructions: { airtelNumber: string; mtnNumber: string; quote: string } }>(resolve => { finish = resolve; }));
  mocks.actionMock = actionMock;
  const eventDate = earliestEventDate(true, new Date(), rules);
  sessionStorage.setItem('gc-booking-draft-v1', JSON.stringify({
    cake: { flavour: 'vanilla', frosting: 'american_buttercream', tierSizes: [10], addons: [] }, desserts: [], fulfilment: 'pickup', address: '', eventDate, timeWindow: 'afternoon', name: 'Mwila', phone: '0977 123 456', email: 'mwila@example.com', designNotes: '', topperMessage: '',
  }));
  render(<BookingWizard catalogue={catalogue} rules={rules} today={today()} closedDates={[]} initialStep={3} />);
  await screen.findByRole('heading', { name: 'Review your booking' });
  const submit = screen.getByRole('button', { name: 'Submit booking' });
  fireEvent.click(submit);
  expect((await screen.findByRole('button', { name: 'Submitting…' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(submit);
  finish({ ok: true, reference: 'CAKE-2026-0001', accessToken: 'test-token', total: 1560, deposit: 780, paymentInstructions: { airtelNumber: '+260111111111', mtnNumber: '+260222222222', quote: 'CAKE-2026-0001' } });
  await screen.findByText(/^CAKE-\d{4}-\d{4}$/);
  expect(actionMock).toHaveBeenCalledOnce();
});
