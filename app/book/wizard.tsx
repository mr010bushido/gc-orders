'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BookingRequest, BookingResponse, BookingField } from '@/lib/booking/schema';
import type { OrderableCatalogue } from '@/lib/catalogue/catalogue';
import type { PricingRules } from '@/lib/basket-pricing';
import { earliestEventDate, isCakeRushDate, priceBasket } from '@/lib/basket-pricing';
import { createBookingAction } from './actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RadioCardGroup } from '@/components/ui/RadioCardGroup';
import { DatePicker } from '@/components/ui/DatePicker';
import { Stepper } from '@/components/ui/Stepper';
import { SummaryCard } from '@/components/ui/SummaryCard';
import { AddonList } from '@/components/ui/AddonList';
import { formatEventDate, formatKwacha } from '@/components/ui/format';
import { normaliseZambianMobile } from '@/lib/phone';
import { ImageUploader, type UploadedImage } from '@/components/ui/ImageUploader';

type Draft = {
  cakeChoice: 'none' | 'menu' | 'wedding';
  cake?: { flavour: string; frosting: string; tierSizes: number[]; addons: string[] };
  desserts: { type: string; quantity: number; note: string }[];
  quoteRequest?: { kind: 'character_cake' | 'wedding_cake' | 'toppings' | 'other'; description: string };
  fulfilment: 'pickup' | 'delivery'; address: string; eventDate: string; timeWindow: 'morning' | 'afternoon' | 'evening';
  name: string; phone: string; email: string; designNotes: string; topperMessage: string;
  privacyConsent: boolean;
  imageTokens: UploadedImage[];
};
const fresh = (): Draft => ({ cakeChoice: 'none', desserts: [], fulfilment: 'pickup', address: '', eventDate: '', timeWindow: 'afternoon', name: '', phone: '', email: '', designNotes: '', topperMessage: '', privacyConsent: false, imageTokens: [] });
const STORAGE = 'gc-booking-draft-v1';
const steps = ['Choose items', 'Cake details', 'Delivery and details', 'Review'];
const errorMessage: Record<string, string> = {
  REQUIRED: 'This field is required.', PHONE_INVALID: 'Enter a valid Zambian mobile number.', EMAIL_INVALID: 'Enter a valid email address.',
  DATE_UNAVAILABLE: 'This date is no longer available. Choose another date.', DATE_TOO_SOON: 'This date is too soon for these items.',
  DESSERT_MIN_QUANTITY: 'Each dessert type is below the configured minimum.', DELIVERY_ADDRESS_REQUIRED: 'Enter the delivery address.',
  DUPLICATE_DESSERT: 'Choose each dessert type only once.', TOO_MANY_DESSERT_LINES: 'A booking can have at most 50 dessert lines.',
  TOO_MANY_TIERS: 'This cake has too many tiers.', INACTIVE_ITEM: 'One of these items is no longer available. Please review your choices.',
  TOO_MANY_IMAGES: 'You can attach up to 3 reference photos.', IMAGE_NOT_FOUND: 'One of the reference photos has expired. Remove it and upload it again.',
  EMPTY_BASKET: 'Choose at least one cake, dessert or quote request.', INVALID_INPUT: 'Please review the highlighted details.',
  WEDDING_WITH_CAKE: 'Wedding cake requests cannot include a price-list cake.', QUOTE_NEEDS_CAKE: 'Custom cake requests need a price-list cake.',
  CONSENT_REQUIRED: 'Please agree to the privacy terms before submitting your booking.',
};
const shortDate = (date: string) => date ? formatEventDate(date) : 'Choose a date';

export function BookingWizard({ catalogue, rules, today, closedDates, initialStep }: {
  catalogue: OrderableCatalogue; rules: PricingRules; today: string; closedDates: string[]; initialStep: number;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(fresh);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Partial<Record<BookingField, string>>>({});
  const [pending, setPending] = useState(false);
  const [uploadsPending, setUploadsPending] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [result, setResult] = useState<(Extract<BookingResponse, { ok: true }> & { priceUpdated?: boolean }) | null>(null);
  const firstError = useRef<HTMLDivElement>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const didClampInitialStep = useRef(false);
  const shouldFocusStepHeading = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { const saved = sessionStorage.getItem(STORAGE); if (saved) { const raw = JSON.parse(saved); const restored = { ...fresh(), ...raw } as Draft; if (!('cakeChoice' in raw)) restored.cakeChoice = restored.quoteRequest?.kind === 'wedding_cake' ? 'wedding' : restored.cake ? 'menu' : 'none'; if (restored.cakeChoice === 'wedding') restored.cake = undefined; if (restored.quoteRequest?.kind !== 'wedding_cake' && !restored.cake) restored.quoteRequest = undefined; setDraft(restored); } } catch { sessionStorage.removeItem(STORAGE); }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { if (ready && !result) sessionStorage.setItem(STORAGE, JSON.stringify(draft)); }, [draft, ready, result]);
  useEffect(() => {
    if (!shouldFocusStepHeading.current) return;
    shouldFocusStepHeading.current = false;
    stepHeading.current?.focus();
  }, [step]);
  useEffect(() => { if (Object.keys(errors).length) (firstError.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-error-focus]'))?.focus(); }, [errors, step]);

  const hasCake = draft.cakeChoice === 'menu';
  const hasCakeDetails = draft.cakeChoice !== 'none';
  const itemsValid = (!hasCake || !!(draft.cake?.flavour && draft.cake.frosting))
    && (hasCake || draft.desserts.length > 0 || !!draft.quoteRequest)
    && (draft.cakeChoice === 'wedding' || !draft.quoteRequest || draft.quoteRequest.description.trim().length >= 10)
    && new Set(draft.desserts.map(item => item.type).filter(Boolean)).size === draft.desserts.length
    && draft.desserts.every(item => !!item.type && Number(item.quantity) >= catalogue.settings.dessert_min_quantity);
  const visibleSteps = hasCakeDetails ? [steps[0], draft.cakeChoice === 'wedding' ? 'Wedding details' : 'Cake details', ...steps.slice(2)] : steps.filter((_, i) => i !== 1);
  const sequence = hasCakeDetails ? [0, 1, 2, 3] : [0, 2, 3];
  const shownStep = sequence.indexOf(step);
  useEffect(() => {
    if (!ready || didClampInitialStep.current) return;
    didClampInitialStep.current = true;
    const valid = hasCakeDetails ? [0, 1, 2, 3] : [0, 2, 3];
    const hasValidBasket = (hasCake && !!(draft.cake?.flavour && draft.cake.frosting)) || draft.cakeChoice === 'wedding' && !!draft.quoteRequest && draft.quoteRequest.description.trim().length >= 10 || draft.desserts.some(d => !!d.type && Number(d.quantity) >= catalogue.settings.dessert_min_quantity);
    const detailsValid = !!(draft.eventDate && draft.timeWindow && draft.name.trim() && draft.phone.trim() && draft.email.trim() && (draft.fulfilment !== 'delivery' || draft.address.trim()));
    const furthest = hasValidBasket ? (detailsValid ? 3 : hasCake ? 1 : 2) : 0;
    const maxStep = valid.filter(value => value <= furthest).at(-1) ?? 0;
    const requested = Math.max(0, Math.min(Number.isInteger(initialStep) ? initialStep : 0, steps.length - 1));
    const requestedStep = valid[requested] ?? valid.at(-1) ?? 0;
    const clamped = valid[Math.min(valid.indexOf(requestedStep), valid.indexOf(maxStep))] ?? 0;
    const clampedUrlStep = valid.indexOf(clamped) + 1;
    if (clamped !== step) {
      const timer = window.setTimeout(() => setStep(clamped), 0);
      if (clampedUrlStep !== initialStep + 1) router.replace(`/book?step=${clampedUrlStep}`, { scroll: false });
      return () => window.clearTimeout(timer);
    }
    if (clampedUrlStep !== initialStep + 1) router.replace(`/book?step=${clampedUrlStep}`, { scroll: false });
  }, [ready, hasCakeDetails, hasCake, draft.cakeChoice, draft.cake?.flavour, draft.cake?.frosting, draft.desserts, draft.quoteRequest, draft.eventDate, draft.timeWindow, draft.name, draft.phone, draft.email, draft.fulfilment, draft.address, catalogue.settings.dessert_min_quantity, initialStep, router, step]);
  const minDate = earliestEventDate(hasCake || draft.cakeChoice === 'wedding', new Date(), rules);
  const pricing = useMemo(() => {
    if (!draft.cake && draft.desserts.length === 0 && draft.quoteRequest) return { lines: [], total: 0, deposit: 0 };
    try { return priceBasket({ ...(draft.cake ? { cake: { flavourGroup: catalogue.flavours.find(f => f.key === draft.cake?.flavour)?.group ?? '', tierSizes: draft.cake.tierSizes, addons: draft.cake.addons } } : {}), desserts: draft.desserts.filter(d => d.type).map(({ type, quantity, note }) => ({ type, quantity: Number(quantity), ...(note ? { note } : {}) })), delivery: draft.fulfilment === 'delivery', eventDate: draft.eventDate || earliestEventDate(false, new Date(), rules) }, new Date(), rules); } catch { return null; }
  }, [draft, catalogue.flavours, rules]);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => { setErrors({}); setDraft(current => ({ ...current, [key]: value })); };
  const imagesChanged = useCallback((images: UploadedImage[]) => {
    if (ready) { setErrors({}); setDraft(current => ({ ...current, imageTokens: images })); }
  }, [ready]);
  const setCake = (patch: Partial<NonNullable<Draft['cake']>>) => { setErrors({}); setDraft(current => ({ ...current, cake: { flavour: '', frosting: '', tierSizes: [10], addons: [], ...current.cake, ...patch } })); };
  const go = (next: number) => { shouldFocusStepHeading.current = true; setErrors({}); setStep(next); router.replace(`/book?step=${sequence.indexOf(next) + 1}`, { scroll: false }); window.scrollTo(0, 0); };
  const next = () => {
    const invalidDessert = draft.desserts.some(d => !d.type || Number(d.quantity) < catalogue.settings.dessert_min_quantity);
    if (step === 0 && (!draft.cake && draft.desserts.length === 0 && !draft.quoteRequest || invalidDessert || (draft.cake && (!draft.cake.flavour || !draft.cake.frosting)) || (draft.cakeChoice !== 'wedding' && draft.quoteRequest && draft.quoteRequest.description.trim().length < 10))) {
      setErrors({ _form: invalidDessert ? `Each dessert type needs at least ${catalogue.settings.dessert_min_quantity} pieces.` : draft.quoteRequest && draft.quoteRequest.description.trim().length < 10 ? 'Describe your request in at least 10 characters.' : 'Choose a cake, dessert or request a quote.' }); return;
    }
    if (step === 1 && draft.cake?.addons.includes('message_topper') && !draft.topperMessage.trim()) { setErrors({ topperMessage: 'Enter the message for your topper.' }); return; }
    if (step === 2) {
      const e: Partial<Record<BookingField, string>> = {};
      if (!draft.eventDate) e.eventDate = 'Choose an event date.';
      if (draft.fulfilment === 'delivery' && !draft.address.trim()) e.address = 'Enter the delivery address.';
      if (!draft.name.trim()) e.name = 'Enter your name.';
      if (!draft.phone.trim()) e.phone = 'Enter your mobile number.';
      else if (!normaliseZambianMobile(draft.phone)) e.phone = errorMessage.PHONE_INVALID;
      if (!draft.email.trim()) e.email = 'Enter your email address.';
      if (Object.keys(e).length) { setErrors(e); return; }
    }
    const order = sequence[sequence.indexOf(step) + 1]; if (order !== undefined) go(order);
  };
  const submit = async () => {
    if (pending || uploadsPending || !pricing) return;
    setPending(true); setErrors({});
    const request: BookingRequest = {
      ...(draft.cake ? { cake: draft.cake } : {}), desserts: draft.desserts.map(({ type, quantity, note }) => ({ type, quantity: Number(quantity), ...(note ? { note } : {}) })),
      ...(draft.quoteRequest ? { quoteRequest: draft.quoteRequest } : {}),
      fulfilment: draft.fulfilment, ...(draft.fulfilment === 'delivery' ? { address: draft.address } : {}), eventDate: draft.eventDate,
      timeWindow: draft.timeWindow, name: draft.name, phone: draft.phone, email: draft.email, privacyConsent: draft.privacyConsent,
      imageTokens: draft.imageTokens.map(image => image.token),
      ...(draft.designNotes ? { designNotes: draft.designNotes } : {}), ...(draft.topperMessage ? { topperMessage: draft.topperMessage } : {}), honeypot,
    };
    try {
      const response = await createBookingAction(request);
      if (response.ok) { sessionStorage.removeItem(STORAGE); setResult({ ...response, priceUpdated: response.total !== pricing.total }); }
      else {
        const mapped = Object.fromEntries(Object.entries(response.errors).map(([key, code]) => [key, errorMessage[code!] ?? 'Please review this field.'])) as Partial<Record<BookingField, string>>;
        const owners: Record<string, number> = { flavour: 0, frosting: 0, desserts: 0, items: 0, cake: 0, tierSizes: 1, addons: 1, topperMessage: 1, imageTokens: 1, quoteDescription: 1, eventDate: 2, timeWindow: 2, name: 2, phone: 2, email: 2, address: 2, fulfilment: 2, privacyConsent: 3, _form: 0 };
        const target = Object.keys(mapped).reduce((earliest, field) => Math.min(earliest, owners[field] ?? 0), 3);
        const targetStep = sequence.filter(value => value <= target).at(-1) ?? 0;
        setStep(targetStep); router.replace(`/book?step=${sequence.indexOf(targetStep) + 1}`, { scroll: false }); setErrors(mapped);
      }
    } catch { setErrors({ _form: 'We could not submit your booking. Check your connection and try again.' }); }
    finally { setPending(false); }
  };
  const fieldError = (field: BookingField) => errors[field];
  const showError = (field: BookingField) => fieldError(field) ? <p id={`error-${field}`} data-error-focus="" tabIndex={-1} className="mt-1 text-sm text-err-ink" role="alert">{fieldError(field)}</p> : null;

  if (result) return <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 py-8 sm:px-8"><header className="border-b border-line pb-6"><p className="text-sm text-ink-soft">{draft.quoteRequest ? 'Quote request received' : 'Booking received'}</p></header><section className="flex flex-1 flex-col justify-center gap-6 py-12"><h1 className="font-display text-4xl text-brand-ink">{result.reference}</h1><p>{draft.quoteRequest ? 'Your request is saved. We’ll send your quote when it is ready.' : 'Your booking is saved. We’ll verify your payment and contact you with updates.'}</p>{result.priceUpdated && <p role="status" className="rounded-md bg-warn-bg p-3 text-sm text-warn-ink">Price updated at submission. The confirmed total below reflects current prices.</p>}{draft.quoteRequest ? <p className="rounded-md border border-line bg-surface p-4">No payment is due until we send your quote.</p> : <><section className="rounded-md border border-line bg-surface px-4"><dl>{result.lines.map((line,i)=><div key={`${line.label}-${i}`} className="flex justify-between gap-4 border-b border-line py-3 text-sm text-ink-soft"><dt>{line.label}</dt><dd className="tabular-nums">{formatKwacha(line.amount)}</dd></div>)}</dl><p className="flex justify-between border-b border-line py-3 font-semibold"><span>Total</span><span className="tabular-nums">{formatKwacha(result.total)}</span></p><p className="flex justify-between py-3 font-semibold text-brand-ink"><span>Deposit due now (50%)</span><span className="tabular-nums">{formatKwacha(result.deposit)}</span></p></section>{!draft.quoteRequest && <section className="space-y-3 rounded-md border border-line bg-surface p-4"><h2 className="font-semibold">Pay your 50% deposit</h2><p>Send {formatKwacha(result.deposit)} by mobile money and quote your booking reference.</p>{result.paymentInstructions.airtelNumber && <p>Airtel Money: <strong>{result.paymentInstructions.airtelNumber}</strong></p>}{result.paymentInstructions.mtnNumber && <p>MTN MoMo: <strong>{result.paymentInstructions.mtnNumber}</strong></p>}</section>}</>}<Button href={`/order/${encodeURIComponent(result.reference)}?t=${encodeURIComponent(result.accessToken)}`}>Continue</Button></section></main>;

  return <main className="mx-auto min-h-dvh max-w-2xl px-5 py-6 sm:px-8">
    <header className="mb-6 flex items-center justify-between border-b border-line pb-5"><Link href="/" className="min-h-11 inline-flex items-center text-sm font-semibold text-ink">Giuseppe&apos;s Cakes</Link><Link href="/" className="min-h-11 inline-flex items-center text-sm text-ink-soft">Save for later</Link></header>
    <Stepper steps={visibleSteps} current={shownStep} className="mb-7" hideTotal={step === 0} />
    <input aria-hidden="true" tabIndex={-1} autoComplete="off" value={honeypot} onChange={event => setHoneypot(event.target.value)} className="absolute -left-[10000px] size-px overflow-hidden" />
    <div ref={firstError}>{errors._form && <p role="alert" className="mb-4 rounded-md bg-err-bg p-3 text-sm text-err-ink">{errors._form}</p>}
    {step === 0 && <section className="space-y-6"><h1 ref={stepHeading} tabIndex={-1} className="font-display text-3xl leading-9">Choose your treats</h1><div role="group" aria-label="Order type" className="grid gap-3"><button type="button" aria-pressed={draft.cakeChoice === 'menu'} onClick={() => { setErrors({}); setDraft(current => ({ ...current, cakeChoice: current.cakeChoice === 'menu' ? 'none' : 'menu', cake: current.cakeChoice === 'menu' ? undefined : current.cake ?? { flavour: '', frosting: '', tierSizes: [10], addons: [] }, quoteRequest: current.cakeChoice === 'menu' ? undefined : current.quoteRequest?.kind === 'wedding_cake' ? undefined : current.quoteRequest })); }} className="min-h-12 rounded-md border border-line bg-surface p-4 text-left aria-pressed:border-brand"><span className="block font-semibold">Cake from our price list</span><span className="text-sm text-ink-soft">Choose a flavour, frosting and size</span></button><button type="button" aria-pressed={draft.cakeChoice === 'wedding'} onClick={() => { setErrors({}); setDraft(current => ({ ...current, cakeChoice: current.cakeChoice === 'wedding' ? 'none' : 'wedding', cake: undefined, quoteRequest: current.cakeChoice === 'wedding' ? undefined : { kind: 'wedding_cake', description: current.quoteRequest?.kind === 'wedding_cake' ? current.quoteRequest.description : '' } })); }} className="min-h-12 rounded-md border border-line bg-surface p-4 text-left aria-pressed:border-brand"><span className="block font-semibold">Wedding cake</span><span className="text-sm text-ink-soft">Tell us your vision and we’ll send a quote</span></button><button type="button" aria-pressed={draft.desserts.length > 0} onClick={() => set('desserts', draft.desserts.length ? [] : [{ type: '', quantity: catalogue.settings.dessert_min_quantity, note: '' }])} className="min-h-12 rounded-md border border-line bg-surface p-4 text-left aria-pressed:border-brand"><span className="block font-semibold">Desserts</span><span className="text-sm text-ink-soft">Add desserts to your order or order them on their own</span></button></div>{hasCake && <div className="space-y-4 rounded-md border border-line bg-surface p-4"><label className="block text-sm font-medium">Flavour<select aria-label="Flavour" aria-invalid={!!errors.flavour} aria-describedby={errors.flavour ? "error-flavour" : undefined} value={draft.cake?.flavour ?? ''} onChange={e => setCake({ flavour: e.target.value })} className="mt-2 h-12 w-full rounded-sm border border-line-strong bg-surface px-3 text-base"><option value="">Choose a flavour</option>{catalogue.flavourGroups.map(group=><optgroup key={group.key} label={`${group.name} · ${formatKwacha(group.basePrice)}`}>{catalogue.flavours.filter(f=>f.group===group.key).map(f=><option key={f.key} value={f.key}>{f.name}{f.diet!=='standard'?` (${f.diet})`:''}</option>)}</optgroup>)}</select>{showError("flavour")}</label><label className="block text-sm font-medium">Frosting<select aria-label="Frosting" aria-invalid={!!errors.frosting} aria-describedby={errors.frosting ? "error-frosting" : undefined} value={draft.cake?.frosting ?? ''} onChange={e=>setCake({frosting:e.target.value})} className="mt-2 h-12 w-full rounded-sm border border-line-strong bg-surface px-3 text-base"><option value="">Choose a frosting</option>{catalogue.frostings.map(x=><option key={x.key} value={x.key}>{x.name}</option>)}</select>{showError("frosting")}</label></div>}

      {draft.desserts.length > 0 && <fieldset><legend className="mb-2 font-semibold">Desserts</legend><div className="space-y-3">{draft.desserts.map((item,i)=><div key={i}><div className="grid grid-cols-[minmax(0,1fr)_82px_auto] items-end gap-2"><label className="text-sm">Dessert<select aria-label={`Dessert ${i+1}`} value={item.type} onChange={e=>set('desserts',draft.desserts.map((d,j)=>i===j?{...d,type:e.target.value}:d))} className="mt-1 h-12 w-full rounded-sm border border-line-strong bg-surface px-2"><option value="">Choose</option>{catalogue.dessertTypes.map(d=><option key={d.key} value={d.key} disabled={draft.desserts.some((chosen,j)=>j!==i&&chosen.type===d.key)}>{d.name} · {formatKwacha(d.price)} each</option>)}</select></label><Input label="Quantity" type="number" min={catalogue.settings.dessert_min_quantity} step="1" value={item.quantity} error={Number(item.quantity)<catalogue.settings.dessert_min_quantity?`Minimum ${catalogue.settings.dessert_min_quantity}`:undefined} onChange={e=>set('desserts',draft.desserts.map((d,j)=>i===j?{...d,quantity:Number(e.target.value)}:d))}/><button type="button" aria-label={`Remove dessert ${i + 1}`} onClick={()=>set('desserts',draft.desserts.filter((_,j)=>i!==j))} className="h-11 px-1 text-ink-soft">Remove</button></div><Input className="mt-2" label="Flavour note (optional)" value={item.note} onChange={e=>set('desserts',draft.desserts.map((d,j)=>i===j?{...d,note:e.target.value}:d))}/></div>)}</div><button type="button" onClick={()=>set('desserts',[...draft.desserts,{type:'',quantity:catalogue.settings.dessert_min_quantity,note:''}])} className="mt-3 min-h-11 text-sm font-semibold text-brand-ink">+ Add dessert type</button></fieldset>}{showError("desserts")}<Button onClick={next} disabled={!itemsValid || uploadsPending} block>Continue</Button></section>}
    {hasCakeDetails && <div hidden={step !== 1}>{draft.cakeChoice === 'wedding' ? <section className="space-y-5"><h1 ref={step === 1 ? stepHeading : null} tabIndex={-1} className="font-display text-3xl leading-9">Wedding details</h1><label className="block text-sm font-medium">Describe your wedding cake<textarea aria-label="Wedding cake description" value={draft.quoteRequest?.description ?? ''} minLength={10} maxLength={2000} onChange={event => set('quoteRequest', { kind: 'wedding_cake', description: event.target.value })} className="mt-2 min-h-24 w-full rounded-sm border border-line-strong bg-surface p-3 text-base"/></label><p className="text-sm text-ink-soft">Include your guest count, number of tiers, theme or colours, and flowers. At least 10 characters.</p>{draft.quoteRequest && draft.quoteRequest.description.trim().length < 10 && <p className="text-sm text-err-ink" role="alert">Describe your request in at least 10 characters.</p>}<ImageUploader initialImages={draft.imageTokens} onChange={imagesChanged} onPendingChange={setUploadsPending}/>{showError('imageTokens')}<div className="flex gap-3"><Button variant="ghost" className="w-auto! shrink-0" onClick={()=>go(0)}>Back</Button><Button onClick={next} disabled={(draft.quoteRequest?.description.trim().length ?? 0) < 10} className="w-auto! min-w-0 flex-1">Continue</Button></div></section> : <section className="space-y-6"><h1 ref={step === 1 ? stepHeading : null} tabIndex={-1} className="font-display text-3xl leading-9">Cake details</h1><fieldset><legend className="mb-2 font-semibold">Tiers and sizes</legend>{(draft.cake?.tierSizes ?? []).map((size,i)=><div key={i} className="mb-2 flex items-center gap-2"><label className="flex-1 text-sm">Tier {i+1}<select aria-label={`Tier ${i + 1} size`} aria-invalid={!!errors.tierSizes} aria-describedby={errors.tierSizes ? "error-tierSizes" : undefined} value={size} onChange={e=>setCake({tierSizes:draft.cake?.tierSizes.map((s,j)=>i===j?Number(e.target.value):s) ?? []})} className="mt-1 h-12 w-full rounded-sm border border-line-strong bg-surface px-3">{catalogue.sizes.map(s=><option key={s.size} value={s.size}>{s.size} inch</option>)}</select></label>{(draft.cake?.tierSizes.length ?? 0)>1&&<button type="button" className="mt-5 min-h-11 px-3 text-ink-soft" onClick={()=>setCake({tierSizes:draft.cake?.tierSizes.filter((_,j)=>j!==i) ?? []})}>Remove</button>}</div>)}</fieldset>{showError("tierSizes")}{(draft.cake?.tierSizes.length ?? 0)<catalogue.settings.max_tiers&&<Button variant="ghost" onClick={()=>setCake({tierSizes:[...(draft.cake?.tierSizes ?? []),10]})}>Add tier</Button>}<AddonList legend="Add-ons" addons={catalogue.addons.map(a=>({key:a.key,label:a.name,price:a.price}))} selected={new Set(draft.cake?.addons ?? [])} onChange={s=>setCake({addons:[...s]})}/>{showError("addons")}{draft.cake?.addons.includes('message_topper')&&<Input label="Message for topper" value={draft.topperMessage} error={fieldError('topperMessage')} onChange={e=>set('topperMessage',e.target.value)}/>}<label className="block text-sm font-medium">Design notes<textarea value={draft.designNotes} onChange={e=>set('designNotes',e.target.value)} maxLength={2000} className="mt-1 min-h-24 w-full rounded-sm border border-line-strong bg-surface p-3 text-base"/></label>{draft.cakeChoice === 'menu' && <section className="space-y-3 rounded-md border border-line bg-surface p-4"><label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={!!draft.quoteRequest} onChange={event => { if (!event.target.checked) setDraft(current => ({ ...current, quoteRequest: undefined })); else set('quoteRequest', { kind: 'other', description: '' }); }} className="size-5 accent-brand"/><span className="font-semibold">Customise this cake (character design, special toppings…)</span></label>{draft.quoteRequest && <><label className="block text-sm font-medium">Request type<select aria-label="Request type" value={draft.quoteRequest.kind} onChange={event => set("quoteRequest", { ...draft.quoteRequest!, kind: event.target.value as NonNullable<Draft["quoteRequest"]>["kind"] })} className="mt-2 h-12 w-full rounded-sm border border-line-strong bg-surface px-3 text-base">{[["character_cake","Character cake"],["toppings","Toppings"],["other","Other"]].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label className="block text-sm font-medium">Describe your request<textarea aria-label="Request description" value={draft.quoteRequest.description} minLength={10} maxLength={2000} onChange={event => set("quoteRequest", { ...draft.quoteRequest!, description: event.target.value })} className="mt-2 min-h-24 w-full rounded-sm border border-line-strong bg-surface p-3 text-base"/></label><p className="text-sm text-ink-soft">Describe it in at least 10 characters. We’ll send a price before payment is due.</p><ImageUploader initialImages={draft.imageTokens} onChange={imagesChanged} onPendingChange={setUploadsPending}/></>}</section>}{!draft.quoteRequest && <ImageUploader initialImages={draft.imageTokens} onChange={imagesChanged} onPendingChange={setUploadsPending}/ >}{showError('imageTokens')}{pricing && <p className="rounded-md border border-line bg-surface p-4 text-sm font-semibold">Estimated total <span className="float-right tabular-nums">{formatKwacha(pricing.total)}</span></p>}<div className="flex gap-3"><Button variant="ghost" className="w-auto! shrink-0" onClick={()=>go(0)}>Back</Button><Button onClick={next} disabled={!!draft.quoteRequest && draft.quoteRequest.description.trim().length < 10} className="w-auto! min-w-0 flex-1">Continue</Button></div></section>}</div>}
    {step === 2 && <section className="space-y-5"><h1 ref={stepHeading} tabIndex={-1} className="font-display text-3xl leading-9">Delivery and details</h1><RadioCardGroup legend="How would you like your order?" value={draft.fulfilment} onChange={v=>set('fulfilment',v as Draft['fulfilment'])} options={[{value:'pickup',label:'Pickup',description:'Collect your order'},{value:'delivery',label:'Delivery',description:`${formatKwacha(catalogue.settings.delivery_fee)} flat fee`}]}/>{draft.fulfilment==='delivery'?<Input label="Delivery address" value={draft.address} error={fieldError('address')} onChange={e=>set('address',e.target.value)}/>:catalogue.settings.pickup_map_url ? <a className="inline-flex min-h-11 items-center text-sm font-semibold" href={catalogue.settings.pickup_map_url} target="_blank" rel="noreferrer">View pickup location ↗</a> : null}<div data-error-focus={fieldError('eventDate') ? '' : undefined} tabIndex={fieldError('eventDate') ? -1 : undefined}><p className="mb-2 text-sm font-medium">Event date</p><DatePicker value={draft.eventDate||null} onChange={date=>set('eventDate',date)} today={today} minDate={minDate} closedDates={closedDates} isRush={date=>hasCake&&isCakeRushDate(date,new Date(),rules)} monthFont="sans"/>{showError('eventDate')}{hasCake&&draft.eventDate&&isCakeRushDate(draft.eventDate,new Date(),rules)&&<p role="alert" className="mt-3 rounded-md bg-warn-bg p-3.5 text-sm text-warn-ink"><strong>Short notice:</strong> a {rules.cake?.rushRatePercent ?? 20}% rush fee applies to the cake.</p>}</div><RadioCardGroup legend="Preferred time" value={draft.timeWindow} onChange={v=>set('timeWindow',v as Draft['timeWindow'])} options={['morning','afternoon','evening'].map(value=>({value,label:value[0].toUpperCase()+value.slice(1)}))}/><Input label="Your name" value={draft.name} error={fieldError('name')} onChange={e=>set('name',e.target.value)}/><Input label="Mobile number" type="tel" autoComplete="tel" value={draft.phone} error={fieldError('phone')} onChange={e=>set('phone',e.target.value)}/><Input label="Email address" type="email" autoComplete="email" value={draft.email} error={fieldError('email')} onChange={e=>set('email',e.target.value)}/><div className="flex gap-3"><Button variant="ghost" className="w-auto! shrink-0" onClick={()=>go(hasCakeDetails?1:0)}>Back</Button><Button onClick={next} className="w-auto! min-w-0 flex-1">Review booking</Button></div></section>}
    {step === 3 && <section className="space-y-5"><h1 ref={stepHeading} tabIndex={-1} className="text-xl font-semibold leading-7">{draft.quoteRequest ? "Review your request" : "Review your booking"}</h1>{pricing && !draft.quoteRequest && <SummaryCard lines={pricing.lines.map(l=>({label:l.label,amount:l.amount,kind:l.kind==='rush'?'rush':undefined}))} total={pricing.total} deposit={pricing.deposit}/>}{draft.quoteRequest && pricing && pricing.lines.length > 0 && <dl className="rounded-md border border-line bg-surface p-4 text-sm">{pricing.lines.map((line, index)=><div key={`${line.label}-${index}`} className="flex justify-between border-b border-line py-2"><dt>{line.label}</dt><dd>{formatKwacha(line.amount)}</dd></div>)}<div className="flex justify-between pt-3 font-semibold"><dt>Base price (price list)</dt><dd>{formatKwacha(pricing.total)}</dd></div></dl>}{draft.quoteRequest && <section className="rounded-md border border-line bg-surface p-4 text-sm"><h2 className="font-semibold">Quote request</h2><p>{draft.quoteRequest.kind.replaceAll("_", " ")}</p><p className="mt-1 whitespace-pre-wrap">{draft.quoteRequest.description}</p><p className="mt-3 text-ink-soft">No deposit is due until we send your quote.</p></section>}<dl className="space-y-2 rounded-md border border-line bg-surface p-4 text-sm"><div><dt className="font-semibold">Event</dt><dd>{shortDate(draft.eventDate)} · {draft.timeWindow}</dd></div><div><dt className="font-semibold">{draft.fulfilment==='delivery'?'Delivery address':'Pickup'}</dt><dd>{draft.fulfilment==='delivery'?draft.address:'Pickup at Giuseppe’s Cakes'}</dd></div><div><dt className="font-semibold">Contact</dt><dd>{draft.name} · {draft.phone} · {draft.email}</dd></div></dl><p className="text-sm leading-5 text-ink-soft">We keep booking details to manage your order. Any reference images are removed 90 days after the event; order details are anonymised after 2 years.</p><label className="flex min-h-11 items-start gap-3 text-sm leading-5"><input type="checkbox" checked={draft.privacyConsent} aria-invalid={!!fieldError('privacyConsent')} aria-describedby={fieldError('privacyConsent') ? 'error-privacyConsent' : undefined} onChange={event => set('privacyConsent', event.target.checked)} className="mt-0.5 size-5 shrink-0 accent-brand"/><span>I agree that my details and photos will be used only to handle this order, never for targeted marketing, and won’t be sold or shared beyond the people needed to fulfil it. See the <Link href="/privacy" className="underline underline-offset-2">privacy page</Link>.</span></label>{showError('privacyConsent')}{showError('eventDate')}{showError('imageTokens')}{errors._form && <p role="alert" className="text-sm text-err-ink">{errors._form}</p>}<div className="flex gap-3"><Button variant="ghost" className="w-auto! shrink-0" disabled={pending} onClick={()=>go(2)}>Back</Button><Button disabled={pending||uploadsPending||!pricing} onClick={submit} className="w-auto! min-w-0 flex-1">{pending?'Submitting…':'Submit booking'}</Button></div></section>}
    </div>
  </main>;
}
