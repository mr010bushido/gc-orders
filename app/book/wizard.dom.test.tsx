import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { buildCatalogue, defaultCatalogue } from '@/lib/catalogue/catalogue';
import { toPricingRules } from '@/lib/catalogue/pricing-rules';
import { earliestEventDate } from '@/lib/basket-pricing';
import { seedCatalogue } from '@/lib/catalogue/seed';
import { createTestDb } from '@/lib/db/test-db';
import { orders } from '@/lib/db/schema';
import { BookingWizard } from './wizard';

const mocks = vi.hoisted(() => ({ db: undefined as unknown, after: vi.fn(), actionMock: undefined as unknown, routerReplace: vi.fn() }));
vi.mock('@/lib/db', () => ({ getDb: () => mocks.db }));
vi.mock('next/server', () => ({ after: mocks.after }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.routerReplace }) }));
vi.mock('@/components/ui/ImageUploader', () => ({ ImageUploader: ({ initialImages, onChange, onPendingChange }: { initialImages: { id: string; token: string }[]; onChange: (images: { id: string; token: string }[]) => void; onPendingChange: (pending: boolean) => void }) => <div><span>{initialImages.length} saved photos</span><button type="button" onClick={() => onPendingChange(true)}>Start photo upload</button><button type="button" onClick={() => { onChange([{ id: 'image-1', token: 'token-1' }]); onPendingChange(false); }}>Finish photo upload</button></div> }));
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
  mocks.routerReplace.mockReset();
  sessionStorage.clear();
});
afterEach(async () => { await testDb.close(); vi.resetModules(); });

it('restores a draft, validates the first step, focuses detail errors, then shows a real booking confirmation', async () => {
  const user = userEvent.setup();
  const draft = { cake: { flavour: '', frosting: '', tierSizes: [10], addons: [] }, desserts: [], fulfilment: 'pickup', address: '', eventDate: '', timeWindow: 'afternoon', name: '', phone: '', email: '', designNotes: '', topperMessage: '' };
  sessionStorage.setItem('gc-booking-draft-v1', JSON.stringify(draft));
  const { container } = render(<BookingWizard catalogue={catalogue} rules={rules} today={today()} closedDates={[]} initialStep={0} />);
  await screen.findByRole('heading', { name: 'Choose your treats' });
  await waitFor(() => expect(screen.getByRole('button', { name: /Cake from our price list/ }).getAttribute('aria-pressed')).toBe('true'));
  expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(true);
  await user.selectOptions(screen.getByRole('combobox', { name: 'Flavour' }), 'vanilla');
  await user.selectOptions(screen.getByRole('combobox', { name: 'Frosting' }), 'american_buttercream');
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
  expect((screen.getByRole('checkbox', { name: /I agree that my details/ }) as HTMLInputElement).checked).toBe(false);
  await user.click(screen.getByRole('checkbox', { name: /I agree that my details/ }));
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
  await waitFor(() => expect(sessionStorage.getItem('gc-booking-draft-v1')).not.toBeNull());
  await user.click(screen.getByRole('button', { name: /^Desserts/ }));
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

it('reviews and submits a quote-only request without showing a deposit', async () => {
  mocks.actionMock = vi.fn(async () => ({ ok: true as const, reference: 'CAKE-2026-0042', accessToken: 'opaque', total: 0, deposit: 0, lines: [], paymentInstructions: { airtelNumber: null, mtnNumber: null, quote: 'CAKE-2026-0042' } }));
  sessionStorage.setItem('gc-booking-draft-v1', JSON.stringify({
    desserts: [], quoteRequest: { kind: 'wedding_cake', description: 'A floral three tier cake' }, fulfilment: 'pickup', address: '',
    eventDate: earliestEventDate(true, new Date(), rules), timeWindow: 'afternoon', name: 'Mwila Banda', phone: '0977 123 456', email: 'mwila@example.com',
    designNotes: '', topperMessage: '', imageTokens: [],
  }));
  render(<BookingWizard catalogue={catalogue} rules={rules} today={today()} closedDates={[]} initialStep={3} />);
  const user = userEvent.setup();
  expect(await screen.findByRole('heading', { name: 'Review your request' })).toBeTruthy();
  expect(screen.getByText('No deposit is due until we send your quote.')).toBeTruthy();
  expect(screen.queryByText('Deposit due now (50%)')).toBeNull();
  await user.click(screen.getByRole('checkbox', { name: /I agree that my details/ }));
  await user.click(screen.getByRole('button', { name: 'Submit booking' }));
  expect(await screen.findByText('Quote request received')).toBeTruthy();
  expect(screen.getByText('No payment is due until we send your quote.')).toBeTruthy();
  expect(screen.queryByText('Pay your 50% deposit')).toBeNull();
  expect(mocks.actionMock).toHaveBeenCalledWith(expect.objectContaining({ quoteRequest: { kind: 'wedding_cake', description: 'A floral three tier cake' } }));
});

it('offers a separate wedding details step and keeps cake choices exclusive', async () => {
  const user = userEvent.setup();
  render(<BookingWizard catalogue={catalogue} rules={rules} today={today()} closedDates={[]} initialStep={0} />);
  await screen.findByRole('heading', { name: 'Choose your treats' });
  await user.click(screen.getByRole('button', { name: /Cake from our price list/ }));
  await user.click(screen.getByRole('button', { name: /Wedding cake/ }));
  expect(screen.getByRole('button', { name: /Cake from our price list/ }).getAttribute('aria-pressed')).toBe('false');
  expect(screen.getByRole('button', { name: /Wedding cake/ }).getAttribute('aria-pressed')).toBe('true');
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  expect(await screen.findByRole('heading', { name: 'Wedding details' })).toBeTruthy();
  expect(screen.getByText(/guest count, number of tiers, theme or colours, and flowers/)).toBeTruthy();
  expect(screen.queryByText('Estimated total')).toBeNull();
  expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(true);
  await user.type(screen.getByLabelText('Wedding cake description'), 'Three tiers with flowers');
  expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(false);
});

it('keeps a valid dessert basket with a wedding cake in the submitted request', async () => {
  sessionStorage.setItem('gc-booking-draft-v1', JSON.stringify({
    cakeChoice: 'wedding', quoteRequest: { kind: 'wedding_cake', description: '' },
    desserts: [{ type: 'brownies', quantity: 30, note: '' }], fulfilment: 'pickup', address: '',
    designNotes: '', topperMessage: '', imageTokens: [],
  }));
  render(<BookingWizard catalogue={catalogue} rules={rules} today={today()} closedDates={[]} initialStep={0} />);
  await screen.findByRole('heading', { name: 'Choose your treats' });
  await waitFor(() => expect(screen.getByRole('button', { name: /Wedding cake/ }).getAttribute('aria-pressed')).toBe('true'));
  expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(false);
  await waitFor(() => {
    const draft = JSON.parse(sessionStorage.getItem('gc-booking-draft-v1')!);
    expect(draft.quoteRequest).toEqual({ kind: 'wedding_cake', description: '' });
    expect(draft.desserts).toEqual([{ type: 'brownies', quantity: 30, note: '' }]);
  });
});

it('shows the minimum description error and disables Continue for a short wedding description', async () => {
  const user = userEvent.setup();
  render(<BookingWizard catalogue={catalogue} rules={rules} today={today()} closedDates={[]} initialStep={0} />);
  await screen.findByRole('heading', { name: 'Choose your treats' });
  await user.click(screen.getByRole('button', { name: /Wedding cake/ }));
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await user.type(screen.getByLabelText('Wedding cake description'), '12345');
  expect(screen.getByRole('alert').textContent).toContain('at least 10 characters');
  expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(true);
});

it('clears customised cake photos when changing to a wedding cake', async () => {
  mocks.actionMock = vi.fn(async () => ({ ok: true as const, reference: 'CAKE-2026-0044', accessToken: 'opaque', total: 0, deposit: 0, lines: [], paymentInstructions: { airtelNumber: null, mtnNumber: null, quote: 'CAKE-2026-0044' } }));
  sessionStorage.setItem('gc-booking-draft-v1', JSON.stringify({
    cakeChoice: 'menu', cake: { flavour: 'vanilla', frosting: 'american_buttercream', tierSizes: [10], addons: [] }, desserts: [],
    quoteRequest: { kind: 'other', description: 'A custom cake design' }, imageTokens: [{ id: 'old', token: 'custom-photo' }], fulfilment: 'pickup', address: '',
    eventDate: earliestEventDate(true, new Date(), rules), timeWindow: 'afternoon', name: 'Mwila Banda', phone: '0977 123 456', email: 'mwila@example.com', designNotes: '', topperMessage: '',
  }));
  const user = userEvent.setup();
  render(<BookingWizard catalogue={catalogue} rules={rules} today={today()} closedDates={[]} initialStep={0} />);
  await screen.findByRole('heading', { name: 'Choose your treats' });
  await waitFor(() => expect(screen.getByText('1 saved photos')).toBeTruthy());
  await user.click(screen.getByRole('button', { name: /Wedding cake/ }));
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await screen.findByRole('heading', { name: 'Wedding details' });
  expect(screen.getByText('0 saved photos')).toBeTruthy();
  await user.type(screen.getByLabelText('Wedding cake description'), 'A three tier wedding cake');
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await user.click(screen.getByRole('button', { name: 'Review booking' }));
  await screen.findByRole('heading', { name: 'Review your request' });
  await user.click(screen.getByRole('checkbox', { name: /I agree that my details/ }));
  await user.click(screen.getByRole('button', { name: 'Submit booking' }));
  await screen.findByText('Quote request received');
  expect(mocks.actionMock).toHaveBeenCalledWith(expect.objectContaining({ imageTokens: [] }));
});

it('drops a legacy non-wedding quote request that has no cake', async () => {
  sessionStorage.setItem('gc-booking-draft-v1', JSON.stringify({
    desserts: [], quoteRequest: { kind: 'other', description: 'A custom request' }, fulfilment: 'pickup', address: '',
  }));
  render(<BookingWizard catalogue={catalogue} rules={rules} today={today()} closedDates={[]} initialStep={0} />);
  await screen.findByRole('heading', { name: 'Choose your treats' });
  await waitFor(() => expect(JSON.parse(sessionStorage.getItem('gc-booking-draft-v1')!).quoteRequest).toBeUndefined());
  expect(JSON.parse(sessionStorage.getItem('gc-booking-draft-v1')!).cakeChoice).toBe('none');
});

it('lets a price-list cake be customised on Cake details and cleared again', async () => {
  sessionStorage.setItem('gc-booking-draft-v1', JSON.stringify({
    cakeChoice: 'menu', cake: { flavour: 'vanilla', frosting: 'american_buttercream', tierSizes: [10], addons: [] }, desserts: [], fulfilment: 'pickup', address: '',
    eventDate: earliestEventDate(true, new Date(), rules), timeWindow: 'afternoon', name: 'Mwila', phone: '0977 123 456', email: 'mwila@example.com', designNotes: '', topperMessage: '',
  }));
  render(<BookingWizard catalogue={catalogue} rules={rules} today={today()} closedDates={[]} initialStep={1} />);
  const user = userEvent.setup();
  await screen.findByRole('heading', { name: 'Cake details' });
  const customize = screen.getByRole('checkbox', { name: /Customise this cake/ });
  await user.click(customize);
  expect(screen.getByRole('combobox', { name: 'Request type' }).textContent).not.toContain('Wedding');
  await user.type(screen.getByLabelText('Request description'), 'Add extra toppings');
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await user.click(screen.getByRole('button', { name: 'Review booking' }));
  expect(await screen.findByRole('heading', { name: 'Review your request' })).toBeTruthy();
  expect(screen.getByText('Base price (price list)')).toBeTruthy();
  expect(screen.getByText('No deposit is due until we send your quote.')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Back' }));
  await user.click(screen.getByRole('button', { name: 'Back' }));
  await user.click(customize);
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await user.click(screen.getByRole('button', { name: 'Review booking' }));
  expect(await screen.findByRole('heading', { name: 'Review your booking' })).toBeTruthy();
  expect(screen.queryByText('Base price (price list)')).toBeNull();
});

it('requires consent on the review step and announces the server validation error', async () => {
  mocks.actionMock = vi.fn(async () => ({ ok: false as const, errors: { privacyConsent: 'CONSENT_REQUIRED' as const } }));
  sessionStorage.setItem('gc-booking-draft-v1', JSON.stringify({
    cake: { flavour: 'vanilla', frosting: 'american_buttercream', tierSizes: [10], addons: [] }, desserts: [], fulfilment: 'pickup', address: '',
    eventDate: earliestEventDate(true, new Date(), rules), timeWindow: 'afternoon', name: 'Mwila', phone: '0977 123 456', email: 'mwila@example.com',
    designNotes: '', topperMessage: '', privacyConsent: false,
  }));
  render(<BookingWizard catalogue={catalogue} rules={rules} today={today()} closedDates={[]} initialStep={3} />);
  const user = userEvent.setup();
  await screen.findByRole('heading', { name: 'Review your booking' });
  expect(screen.getByRole('link', { name: 'privacy page' }).getAttribute('href')).toBe('/privacy');
  await user.click(screen.getByRole('button', { name: 'Submit booking' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Please agree to the privacy terms');
  expect(screen.getByRole('checkbox', { name: /I agree that my details/ }).getAttribute('aria-invalid')).toBe('true');
});

it('routes a server phone error from Review to details, announces and focuses it', async () => {
  mocks.actionMock = vi.fn(async () => ({ ok: false as const, errors: { phone: 'PHONE_INVALID' as const } }));
  sessionStorage.setItem('gc-booking-draft-v1', JSON.stringify({
    cake: { flavour: 'vanilla', frosting: 'american_buttercream', tierSizes: [10], addons: [] }, desserts: [], fulfilment: 'pickup', address: '', eventDate: earliestEventDate(true, new Date(), rules), timeWindow: 'afternoon', name: 'Mwila', phone: '12345', email: 'mwila@example.com', designNotes: '', topperMessage: '',
  }));
  render(<BookingWizard catalogue={catalogue} rules={rules} today={today()} closedDates={[]} initialStep={3} />);
  const user = userEvent.setup();
  await screen.findByRole('heading', { name: 'Review your booking' });
  await waitFor(() => expect((screen.getByRole('button', { name: 'Submit booking' }) as HTMLButtonElement).disabled).toBe(false));
  await user.click(screen.getByRole('checkbox', { name: /I agree that my details/ }));
  await user.click(screen.getByRole('button', { name: 'Submit booking' }));
  expect(await screen.findByRole('heading', { name: 'Delivery and details' })).toBeTruthy();
  expect(await screen.findByText('Enter a valid Zambian mobile number.')).toBeTruthy();
  await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Mobile number')));
  expect(await testDb.db.select().from(orders)).toHaveLength(0);
});

it('requires message topper text before leaving Cake details and focuses the visible error', async () => {
  sessionStorage.setItem('gc-booking-draft-v1', JSON.stringify({
    cake: { flavour: 'vanilla', frosting: 'american_buttercream', tierSizes: [10], addons: ['message_topper'] }, desserts: [], fulfilment: 'pickup', address: '', eventDate: '', timeWindow: 'afternoon', name: '', phone: '', email: '', designNotes: '', topperMessage: '',
  }));
  render(<BookingWizard catalogue={catalogue} rules={rules} today={today()} closedDates={[]} initialStep={1} />);
  const user = userEvent.setup();
  await screen.findByRole('heading', { name: 'Cake details' });
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Enter the message for your topper.');
  await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Message for topper')));
  expect(await testDb.db.select().from(orders)).toHaveLength(0);
});

it('shows the server total and notice when current pricing differs from the review', async () => {
  mocks.actionMock = vi.fn(async () => ({ ok: true as const, reference: 'CAKE-2026-0002', accessToken: 'opaque', total: 1700, deposit: 850, lines: [{ label: 'Cake', amount: 1700, kind: 'cake' }], paymentInstructions: { airtelNumber: null, mtnNumber: null, quote: 'CAKE-2026-0002' } }));
  sessionStorage.setItem('gc-booking-draft-v1', JSON.stringify({
    cake: { flavour: 'vanilla', frosting: 'american_buttercream', tierSizes: [10], addons: [] }, desserts: [], fulfilment: 'pickup', address: '', eventDate: earliestEventDate(true, new Date(), rules), timeWindow: 'afternoon', name: 'Mwila', phone: '0977 123 456', email: 'mwila@example.com', designNotes: '', topperMessage: '',
  }));
  render(<BookingWizard catalogue={catalogue} rules={rules} today={today()} closedDates={[]} initialStep={3} />);
  const user = userEvent.setup();
  await screen.findByRole('heading', { name: 'Review your booking' });
  await waitFor(() => expect((screen.getByRole('button', { name: 'Submit booking' }) as HTMLButtonElement).disabled).toBe(false));
  await user.click(screen.getByRole('checkbox', { name: /I agree that my details/ }));
  await user.click(screen.getByRole('button', { name: 'Submit booking' }));
  expect(await screen.findByRole('status')).toBeTruthy();
  expect(screen.getAllByText('K1,700')).toHaveLength(2);
});

it('clamps deep links after restoring dessert-only and empty drafts', async () => {
  sessionStorage.setItem('gc-booking-draft-v1', JSON.stringify({ desserts: [{ type: 'brownies', quantity: 30, note: '' }] }));
  const { unmount } = render(<BookingWizard catalogue={catalogue} rules={rules} today={today()} closedDates={[]} initialStep={2} />);
  expect(await screen.findByRole('heading', { name: 'Delivery and details' })).toBeTruthy();
  unmount();
  sessionStorage.clear();
  render(<BookingWizard catalogue={catalogue} rules={rules} today={today()} closedDates={[]} initialStep={3} />);
  expect(await screen.findByRole('heading', { name: 'Choose your treats' })).toBeTruthy();
  await waitFor(() => expect(mocks.routerReplace).toHaveBeenCalledWith('/book?step=1', { scroll: false }));
  expect(screen.queryByText(/NaN|Invalid Date/)).toBeNull();
});

it('prevents selecting a dessert type already used by another row', async () => {
  const user = userEvent.setup();
  render(<BookingWizard catalogue={catalogue} rules={rules} today={today()} closedDates={[]} initialStep={0} />);
  await screen.findByRole('heading', { name: 'Choose your treats' });
  await waitFor(() => expect(sessionStorage.getItem('gc-booking-draft-v1')).not.toBeNull());
  await user.click(screen.getByRole('button', { name: /^Desserts/ }));
  await user.click(screen.getByRole('button', { name: '+ Add dessert type' }));
  await user.selectOptions(screen.getByLabelText('Dessert 1'), 'brownies');
  expect((screen.getByLabelText('Dessert 2').querySelector('option[value="brownies"]') as HTMLOptionElement).disabled).toBe(true);
  expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(true);
});

it('renders one dessert error alert when the server rejects duplicate types', async () => {
  mocks.actionMock = vi.fn(async () => ({ ok: false as const, errors: { desserts: 'DUPLICATE_DESSERT' as const } }));
  sessionStorage.setItem('gc-booking-draft-v1', JSON.stringify({
    desserts: [{ type: 'brownies', quantity: 30, note: '' }, { type: 'brownies', quantity: 30, note: '' }],
    fulfilment: 'pickup', address: '', eventDate: earliestEventDate(false, new Date(), rules), timeWindow: 'afternoon', name: 'Mwila', phone: '0977 123 456', email: 'mwila@example.com', designNotes: '', topperMessage: '',
  }));
  render(<BookingWizard catalogue={catalogue} rules={rules} today={today()} closedDates={[]} initialStep={3} />);
  const user = userEvent.setup();
  await screen.findByRole('heading', { name: 'Review your booking' });
  await waitFor(() => expect((screen.getByRole('button', { name: 'Submit booking' }) as HTMLButtonElement).disabled).toBe(false));
  await user.click(screen.getByRole('checkbox', { name: /I agree that my details/ }));
  await user.click(screen.getByRole('button', { name: 'Submit booking' }));
  await screen.findByText('Choose each dessert type only once.');
  expect(document.querySelectorAll('#error-desserts[role="alert"]')).toHaveLength(1);
  expect(new Set([...document.querySelectorAll('[id]')].map(node => node.id)).size).toBe(document.querySelectorAll('[id]').length);
});

it('keeps dessert and tier remove controls distinctly named', async () => {
  sessionStorage.setItem('gc-booking-draft-v1', JSON.stringify({
    cake: { flavour: 'vanilla', frosting: 'american_buttercream', tierSizes: [8, 10], addons: [] },
    desserts: [{ type: 'brownies', quantity: 30, note: '' }, { type: 'cupcakes', quantity: 30, note: '' }],
  }));
  render(<BookingWizard catalogue={catalogue} rules={rules} today={today()} closedDates={[]} initialStep={0} />);
  await screen.findByRole('heading', { name: 'Choose your treats' });
  await waitFor(() => expect(screen.getByLabelText('Dessert 2')).toBeTruthy());
  expect(screen.getByRole('button', { name: 'Remove dessert 1' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Remove dessert 2' })).toBeTruthy();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await screen.findByRole('heading', { name: 'Cake details' });
  expect(screen.getByLabelText('Tier 1 size')).toBeTruthy();
  expect(screen.getByLabelText('Tier 2 size')).toBeTruthy();
});

it('skips focus on mount and focuses the heading after Continue and Back', async () => {
  const user = userEvent.setup();
  sessionStorage.setItem('gc-booking-draft-v1', JSON.stringify({
    cake: { flavour: 'vanilla', frosting: 'american_buttercream', tierSizes: [10], addons: [] }, desserts: [], fulfilment: 'pickup', address: '', eventDate: '', timeWindow: 'afternoon', name: '', phone: '', email: '', designNotes: '', topperMessage: '',
  }));
  render(<BookingWizard catalogue={catalogue} rules={rules} today={today()} closedDates={[]} initialStep={0} />);
  const chooseHeading = await screen.findByRole('heading', { name: 'Choose your treats' });
  await waitFor(() => expect(screen.getByRole('button', { name: /Cake from our price list/ }).getAttribute('aria-pressed')).toBe('true'));
  expect(document.activeElement).not.toBe(chooseHeading);
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  const detailsHeading = await screen.findByRole('heading', { name: 'Cake details' });
  await waitFor(() => expect(document.activeElement).toBe(detailsHeading));
  await user.click(screen.getByRole('button', { name: 'Back' }));
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Choose your treats' })));
});

it('restores uploaded image tokens from the booking draft and submits them with the booking', async () => {
  mocks.actionMock = vi.fn(async () => ({ ok: true as const, reference: 'CAKE-2026-0010', accessToken: 'opaque', total: 1700, deposit: 850, lines: [{ label: 'Cake', amount: 1700, kind: 'cake' }], paymentInstructions: { airtelNumber: null, mtnNumber: null, quote: 'CAKE-2026-0010' } }));
  sessionStorage.setItem('gc-booking-draft-v1', JSON.stringify({
    cake: { flavour: 'vanilla', frosting: 'american_buttercream', tierSizes: [10], addons: [] }, desserts: [], fulfilment: 'pickup', address: '', eventDate: earliestEventDate(true, new Date(), rules), timeWindow: 'afternoon', name: 'Mwila', phone: '0977 123 456', email: 'mwila@example.com', designNotes: '', topperMessage: '', imageTokens: [{ id: 'saved-image', token: 'saved-token' }],
  }));
  render(<BookingWizard catalogue={catalogue} rules={rules} today={today()} closedDates={[]} initialStep={3} />);
  const user = userEvent.setup();
  await screen.findByRole('heading', { name: 'Review your booking' });
  await user.click(screen.getByRole('checkbox', { name: /I agree that my details/ }));
  await user.click(screen.getByRole('button', { name: 'Submit booking' }));
  await screen.findByRole('status');
  expect(mocks.actionMock).toHaveBeenCalledWith(expect.objectContaining({ imageTokens: ['saved-token'] }));
  expect(sessionStorage.getItem('gc-booking-draft-v1')).toBeNull();
});

it('keeps booking submission disabled while a photo upload is pending', async () => {
  sessionStorage.setItem('gc-booking-draft-v1', JSON.stringify({
    cake: { flavour: 'vanilla', frosting: 'american_buttercream', tierSizes: [10], addons: [] }, desserts: [], fulfilment: 'pickup', address: '', eventDate: earliestEventDate(true, new Date(), rules), timeWindow: 'afternoon', name: 'Mwila', phone: '0977 123 456', email: 'mwila@example.com', designNotes: '', topperMessage: '', imageTokens: [],
  }));
  render(<BookingWizard catalogue={catalogue} rules={rules} today={today()} closedDates={[]} initialStep={1} />);
  const user = userEvent.setup();
  await screen.findByRole('heading', { name: 'Cake details' });
  await user.click(screen.getByRole('button', { name: 'Start photo upload' }));
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await screen.findByRole('heading', { name: 'Delivery and details' });
  await user.click(screen.getByRole('button', { name: 'Review booking' }));
  await screen.findByRole('heading', { name: 'Review your booking' });
  expect((screen.getByRole('button', { name: 'Submit booking' }) as HTMLButtonElement).disabled).toBe(true);
  expect(mocks.actionMock).not.toHaveBeenCalled();
});

it('ignores a second submit while the action is pending', async () => {
  let finish!: (value: { ok: true; reference: string; accessToken: string; total: number; deposit: number; lines: { label: string; amount: number; kind: string }[]; paymentInstructions: { airtelNumber: string; mtnNumber: string; quote: string } }) => void;
  const actionMock = vi.fn(() => new Promise<{ ok: true; reference: string; accessToken: string; total: number; deposit: number; lines: { label: string; amount: number; kind: string }[]; paymentInstructions: { airtelNumber: string; mtnNumber: string; quote: string } }>(resolve => { finish = resolve; }));
  mocks.actionMock = actionMock;
  const eventDate = earliestEventDate(true, new Date(), rules);
  sessionStorage.setItem('gc-booking-draft-v1', JSON.stringify({
    cake: { flavour: 'vanilla', frosting: 'american_buttercream', tierSizes: [10], addons: [] }, desserts: [], fulfilment: 'pickup', address: '', eventDate, timeWindow: 'afternoon', name: 'Mwila', phone: '0977 123 456', email: 'mwila@example.com', designNotes: '', topperMessage: '',
  }));
  render(<BookingWizard catalogue={catalogue} rules={rules} today={today()} closedDates={[]} initialStep={3} />);
  await screen.findByRole('heading', { name: 'Review your booking' });
  await waitFor(() => expect((screen.getByRole('button', { name: 'Submit booking' }) as HTMLButtonElement).disabled).toBe(false));
  const submit = screen.getByRole('button', { name: 'Submit booking' });
  await userEvent.setup().click(screen.getByRole('checkbox', { name: /I agree that my details/ }));
  fireEvent.click(submit);
  expect((await screen.findByRole('button', { name: 'Submitting…' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(submit);
  finish({ ok: true, reference: 'CAKE-2026-0001', accessToken: 'test-token', total: 1560, deposit: 780, lines: [{ label: 'Cake', amount: 1560, kind: 'cake' }], paymentInstructions: { airtelNumber: '+260111111111', mtnNumber: '+260222222222', quote: 'CAKE-2026-0001' } });
  await screen.findByText(/^CAKE-\d{4}-\d{4}$/);
  expect(actionMock).toHaveBeenCalledOnce();
  expect(screen.getByRole('link', { name: 'Continue' }).getAttribute('href')).toBe('/order/CAKE-2026-0001?t=test-token');
});
