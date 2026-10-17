import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Gallery } from './Gallery';

export const metadata: Metadata = { title: 'Components | Giuseppe’s Cakes (dev)', robots: { index: false } };

const lusakaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lusaka' }).format(new Date());

export default function ComponentsPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <Gallery today={lusakaToday()} />;
}
