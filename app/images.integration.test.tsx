import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { eq } from 'drizzle-orm';
import { expect, it, vi } from 'vitest';
import { createTestDb } from '@/lib/db/test-db';
import { orders } from '@/lib/db/schema';
import { seedCatalogue } from '@/lib/catalogue/seed';
import { createBooking } from '@/lib/booking/create-booking';
import { makeImageStoreFake } from '@/lib/platform/fakes';
import { getOwnerOrderDetail } from '@/lib/owner/orders-query';
import { getOrderImageUrls } from '@/lib/images/owner';
import { OrderDetailSheet } from './owner/(console)/orders/order-detail-sheet';

const deps = vi.hoisted(() => ({ db: undefined as unknown, store: undefined as unknown, limiter: undefined as unknown }));
vi.mock('@/lib/db', () => ({ getDb: () => deps.db }));
vi.mock('@/lib/platform/image-store-select', () => ({ imageStore: () => ({
  put: (...args: Parameters<import('@/lib/platform/image-store').ImageStore['put']>) => (deps.store as import('@/lib/platform/image-store').ImageStore).put(...args),
  createSignedUrl: (...args: Parameters<import('@/lib/platform/image-store').ImageStore['createSignedUrl']>) => (deps.store as import('@/lib/platform/image-store').ImageStore).createSignedUrl(...args),
  delete: (...args: Parameters<import('@/lib/platform/image-store').ImageStore['delete']>) => (deps.store as import('@/lib/platform/image-store').ImageStore).delete(...args),
}) }));
vi.mock('@/lib/platform/rate-limit', () => ({ rateLimiter: { hit: (...args: unknown[]) => (deps.limiter as { hit: (...args: unknown[]) => unknown }).hit(...args) } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }));

it('uploads through POST, attaches the token to a booking, and renders its owner signed URL', async () => {
  const test = await createTestDb();
  const memory = makeImageStoreFake();
  deps.db = test.db;
  deps.store = memory.store;
  deps.limiter = { hit: async () => true };
  try {
    await seedCatalogue(test.db);
    const { POST } = await import('@/app/api/uploads/route');
    const form = new FormData();
    form.append('image', new Blob([readFileSync('lib/images/fixtures/gps-large.jpg')], { type: 'image/jpeg' }), 'design.jpg');
    const response = await POST(new Request('http://localhost/api/uploads', { method: 'POST', body: form }));
    expect(response.status).toBe(201);
    const uploaded = await response.json() as { id: string; token: string };

    const booked = await createBooking(test.db, {
      cake: { flavour: 'vanilla', frosting: 'american_buttercream', tierSizes: [8], addons: [] },
      imageTokens: [uploaded.token], fulfilment: 'pickup', eventDate: '2026-11-30', timeWindow: 'afternoon',
      name: 'Mwila Banda', phone: '0977 123 456', email: 'mwila@example.com', privacyConsent: true,
    }, new Date('2026-10-17T08:00:00Z'));
    expect(booked.ok).toBe(true);
    if (!booked.ok) return;

    const [savedOrder] = await test.db.select().from(orders).where(eq(orders.reference, booked.reference));
    const detail = await getOwnerOrderDetail(test.db, booked.reference, new Date('2026-10-17T08:00:00Z'));
    const images = await getOrderImageUrls(savedOrder.id, { db: test.db, store: memory.store, guard: async () => ({ id: 'owner', email: 'owner@example.com' }) });
    expect(images).toHaveLength(1);
    expect(memory.readSignedUrl(images[0].url)).not.toBeNull();
    const markup = renderToStaticMarkup(<OrderDetailSheet order={detail} images={images} onClose={() => {}} />);
    expect(markup).toContain('Reference photos');
    expect(markup).toContain(`href="${images[0].url}"`);
    expect(markup).toContain(`alt="Reference photo 1 for ${booked.reference}"`);
    expect(uploaded.id).toBeTruthy();
  } finally {
    deps.db = undefined;
    deps.store = undefined;
    deps.limiter = undefined;
    await test.close();
  }
});
