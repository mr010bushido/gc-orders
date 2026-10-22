"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Button } from "../../../../components/ui/Button";
import { Input } from "../../../../components/ui/Input";
import { formatKwacha } from "../../../../components/ui/format";
import type { FullCatalogue } from "../../../../lib/catalogue/catalogue";
import type { SettingKey } from "../../../../lib/catalogue/settings";
import { manageCatalogueItem, saveFeesAndRules, savePaymentAndContact, savePrices, saveTimeWindows, type CatalogueItemAction, type SettingsActionResult } from "./actions";
import { SettingsNotice } from "./settings-notice";

type PriceValues = {
  flavourGroupPrices: Record<string, string>;
  addonPrices: Record<string, string>;
  dessertPrices: Record<string, string>;
  sizeMultipliers: Record<string, string>;
};

type Props = { catalogue: FullCatalogue; updatedAt?: Partial<Record<SettingKey, string>> };
type ResultScope = "prices" | "sizes" | "rules" | "windows" | "payment";

const ruleFields = [
  ["delivery_fee", "Delivery fee (ZMW)"], ["rush_rate_percent", "Rush rate (%)"], ["rush_window_hours", "Rush window (hours)"],
  ["dessert_min_quantity", "Minimum dessert quantity"], ["dessert_lead_days", "Dessert lead time (days)"],
  ["dessert_surcharge_percent", "Dessert surcharge (%)"], ["max_tiers", "Maximum cake tiers"],
  ["capacity_per_day", "Orders per day"], ["payment_expiry_hours", "Payment expiry (hours)"],
] as const satisfies readonly (readonly [SettingKey, string])[];
const timeFields = [
  ["morning_start_hour", "Morning starts"], ["morning_end_hour", "Morning ends"],
  ["afternoon_start_hour", "Afternoon starts"], ["afternoon_end_hour", "Afternoon ends"],
  ["evening_start_hour", "Evening starts"], ["evening_end_hour", "Evening ends"],
] as const satisfies readonly (readonly [SettingKey, string])[];
const paymentFields = [
  ["airtel_number", "Airtel number"], ["mtn_number", "MTN number"],
  ["pickup_map_url", "Pickup map link"], ["owner_alert_phone", "Owner alert phone (optional)"],
] as const satisfies readonly (readonly [SettingKey, string])[];

function UpdatedAt({ value }: { value?: string }) {
  return <p className="mt-1 text-xs text-ink-soft">{value ? `Last changed ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lusaka" }).format(new Date(value))}` : "Not changed yet"}</p>;
}

const priceValues = (catalogue: FullCatalogue): PriceValues => ({
  flavourGroupPrices: Object.fromEntries(catalogue.flavourGroups.map(item => [item.key, String(item.basePrice)])),
  addonPrices: Object.fromEntries(catalogue.addons.map(item => [item.key, String(item.price)])),
  dessertPrices: Object.fromEntries(catalogue.dessertTypes.map(item => [item.key, String(item.price)])),
  sizeMultipliers: Object.fromEntries(catalogue.sizes.map(item => [String(item.size), (item.multiplier / 100).toFixed(2)])),
});

const sections = [
  { id: "prices", label: "Prices" }, { id: "sizes", label: "Sizes" },
  { id: "rules", label: "Fees and rules" }, { id: "windows", label: "Time windows" },
  { id: "payment", label: "Payment and contact" },
] as const;

function Section({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-4 space-y-4">
    <div>
      <h2 id={`${id}-heading`} className="text-lg font-semibold">{label}</h2>
      <div className="mt-3"><SettingsNotice /></div>
    </div>
    {children}
  </section>;
}

function ResultMessage({ result, success }: { result: SettingsActionResult | null; success: string }) {
  if (!result) return null;
  if (!result.ok && !result.errors._form) return null;
  return result.ok
    ? <p role="status" className="text-sm text-ok-ink">{success}</p>
    : <p role="alert" className="text-sm text-err-ink">{Object.values(result.errors)[0]?.message ?? "Review the fields and try again."}</p>;
}

function RenameControl({ kind, itemKey, name, disabled, onSave }: {
  kind: "flavour" | "frosting" | "addon" | "dessert";
  itemKey: string;
  name: string;
  disabled: boolean;
  onSave: (input: CatalogueItemAction) => void;
}) {
  const [value, setValue] = useState(name);
  return <details className="min-w-24">
    <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm text-brand-ink underline underline-offset-4">Edit name</summary>
    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
      <Input label="Name" value={value} onChange={event => setValue(event.target.value)} />
      <Button variant="ghost" disabled={disabled || !value.trim()} onClick={() => onSave({ kind, operation: "rename", key: itemKey, name: value })}>Save name</Button>
    </div>
  </details>;
}

function SuggestionsControl({ itemKey, suggestions, disabled, onSave }: {
  itemKey: string;
  suggestions: readonly string[];
  disabled: boolean;
  onSave: (input: CatalogueItemAction) => void;
}) {
  const [value, setValue] = useState(suggestions.join(", "));
  return <details className="min-w-36">
    <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm text-brand-ink underline underline-offset-4">Edit flavours</summary>
    <div className="mt-2 flex flex-col gap-2">
      <Input label="Flavour suggestions" helper="Separate names with commas" value={value} onChange={event => setValue(event.target.value)} />
      <Button variant="ghost" disabled={disabled} onClick={() => onSave({ kind: "dessert", operation: "suggestions", key: itemKey, flavourSuggestions: value.split(",").map(item => item.trim()).filter(Boolean) })}>Save flavours</Button>
    </div>
  </details>;
}

export function SettingsManager({ catalogue, updatedAt = {} }: Props) {
  const [pending, startTransition] = useTransition();
  const [prices, setPrices] = useState(() => priceValues(catalogue));
  const [ruleValues, setRuleValues] = useState(() => Object.fromEntries(ruleFields.map(([key]) => [key, String(catalogue.settings[key])])));
  const [timeValues, setTimeValues] = useState(() => Object.fromEntries(timeFields.map(([key]) => [key, catalogue.settings[key] ?? ""])));
  const [paymentValues, setPaymentValues] = useState(() => Object.fromEntries(paymentFields.map(([key]) => [key, catalogue.settings[key] ?? ""])));
  const [result, setResult] = useState<SettingsActionResult | null>(null);
  const [resultScope, setResultScope] = useState<ResultScope | null>(null);
  const [newFlavour, setNewFlavour] = useState({ name: "", group: catalogue.flavourGroups[0]?.key ?? "", diet: "standard" });
  const [newFrosting, setNewFrosting] = useState("");
  const [newAddon, setNewAddon] = useState({ name: "", price: "1" });
  const [newDessert, setNewDessert] = useState({ name: "", price: "1", flavourSuggestions: "" });

  const changeValue = (field: keyof PriceValues, key: string, value: string) => {
    setResult(null);
    setPrices(current => ({ ...current, [field]: { ...current[field], [key]: value } }));
  };

  const submitPrices = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const changes = [
      ...catalogue.flavourGroups.map(item => [`${item.name} base price`, item.basePrice, prices.flavourGroupPrices[item.key]] as const),
      ...catalogue.addons.map(item => [`${item.name} price`, item.price, prices.addonPrices[item.key]] as const),
      ...catalogue.dessertTypes.map(item => [`${item.name} price`, item.price, prices.dessertPrices[item.key]] as const),
    ].filter(([, oldValue, newValue]) => String(oldValue) !== newValue);
    if (changes.length && !window.confirm(`Review these price changes before saving:\n${changes.map(([name, oldValue, newValue]) => `${name}: ${formatKwacha(oldValue)} → ${/^\d+$/.test(newValue) ? formatKwacha(Number(newValue)) : newValue}`).join("\n")}`)) return;
    startTransition(async () => {
      const next = await savePrices({ ...prices, sizeMultipliers: {} });
      setResult(next);
      setResultScope("prices");
    });
  };

  const submitSettings = (event: FormEvent<HTMLFormElement>, action: (input: Record<string, unknown>) => Promise<SettingsActionResult>, values: Record<string, string>, scope: ResultScope) => {
    event.preventDefault();
    startTransition(async () => {
      setResult(await action(values));
      setResultScope(scope);
    });
  };

  const submitSizes = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const next = await savePrices({ flavourGroupPrices: {}, addonPrices: {}, dessertPrices: {}, sizeMultipliers: prices.sizeMultipliers });
      setResult(next);
      setResultScope("sizes");
    });
  };

  const runItemAction = (input: CatalogueItemAction) => {
    startTransition(async () => {
      const next = await manageCatalogueItem(input);
      setResult(next);
      setResultScope("prices");
    });
  };

  const addItem = (event: FormEvent<HTMLFormElement>, input: CatalogueItemAction, reset: () => void) => {
    event.preventDefault();
    startTransition(async () => {
      const next = await manageCatalogueItem(input);
      setResult(next);
      setResultScope("prices");
      if (next.ok) {
        reset();
      }
    });
  };

  const priceError = (key: string) => result && !result.ok ? result.errors[key]?.message : undefined;

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
    <div className="mt-6 space-y-10">
      <Section id="prices" label="Prices">
        <form onSubmit={submitPrices} className="space-y-7">
          <fieldset className="space-y-3">
            <legend className="font-semibold">Flavour group base prices</legend>
            <p className="text-sm text-ink-soft">One base price applies to every flavour in its group.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {catalogue.flavourGroups.map(group => <Input key={group.key} label={`${group.name} · base price (ZMW)`}
                inputMode="numeric" value={prices.flavourGroupPrices[group.key] ?? ""}
                onChange={event => changeValue("flavourGroupPrices", group.key, event.target.value)}
                error={priceError(`flavourGroupPrices.${group.key}`)} />)}
            </div>
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="font-semibold">Add-on prices</legend>
            <div className="divide-y divide-line border-y border-line">
              {catalogue.addons.map(item => <div key={item.key} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-32 flex-1 text-sm">{item.name}{!item.active && <span className="ml-2 text-ink-soft">Hidden</span>}
                  <RenameControl kind="addon" itemKey={item.key} name={item.name} disabled={pending} onSave={runItemAction} />
                </div>
                <Input className="w-36" label={`${item.name} price (ZMW)`} inputMode="numeric" value={prices.addonPrices[item.key] ?? ""}
                  onChange={event => changeValue("addonPrices", item.key, event.target.value)} error={priceError(`addonPrices.${item.key}`)} />
                <Button variant="ghost" disabled={pending} onClick={() => runItemAction({ kind: "addon", operation: item.active ? "hide" : "show", key: item.key })}>{item.active ? "Hide" : "Show"}</Button>
              </div>)}
            </div>
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="font-semibold">Dessert prices</legend>
            <div className="divide-y divide-line border-y border-line">
              {catalogue.dessertTypes.map(item => <div key={item.key} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-32 flex-1 text-sm">{item.name}{!item.active && <span className="ml-2 text-ink-soft">Hidden</span>}
                  <RenameControl kind="dessert" itemKey={item.key} name={item.name} disabled={pending} onSave={runItemAction} />
                  <SuggestionsControl itemKey={item.key} suggestions={item.flavourSuggestions} disabled={pending} onSave={runItemAction} />
                </div>
                <Input className="w-36" label={`${item.name} price (ZMW)`} inputMode="numeric" value={prices.dessertPrices[item.key] ?? ""}
                  onChange={event => changeValue("dessertPrices", item.key, event.target.value)} error={priceError(`dessertPrices.${item.key}`)} />
                <Button variant="ghost" disabled={pending} onClick={() => runItemAction({ kind: "dessert", operation: item.active ? "hide" : "show", key: item.key })}>{item.active ? "Hide" : "Show"}</Button>
              </div>)}
            </div>
          </fieldset>
          {resultScope === "prices" && <ResultMessage result={result} success="Prices saved. They apply to new bookings." />}
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save prices"}</Button>
        </form>

        <div className="space-y-7 border-t border-line pt-6">
          <fieldset className="space-y-3">
            <legend className="font-semibold">Flavours</legend>
            {catalogue.flavourGroups.map(group => <div key={group.key} className="space-y-2">
              <h3 className="text-sm font-medium text-ink-soft">{group.name}</h3>
              <ul className="divide-y divide-line border-y border-line">
                {catalogue.flavours.filter(item => item.group === group.key).map(item => <li key={item.key} className="flex min-h-12 items-center gap-3 py-2">
                  <div className="min-w-0 flex-1 text-sm">{item.name}{item.diet !== "standard" ? ` · ${item.diet}` : ""}{!item.active && <span className="ml-2 text-ink-soft">Hidden</span>}
                    <RenameControl kind="flavour" itemKey={item.key} name={item.name} disabled={pending} onSave={runItemAction} />
                  </div>
                  <Button variant="ghost" disabled={pending} onClick={() => runItemAction({ kind: "flavour", operation: item.active ? "hide" : "show", key: item.key })}>{item.active ? "Hide" : "Show"}</Button>
                </li>)}
              </ul>
            </div>)}
            <form className="grid gap-3 border-b border-line pb-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
              onSubmit={event => addItem(event, { kind: "flavour", operation: "add", name: newFlavour.name, group: newFlavour.group, diet: newFlavour.diet }, () => setNewFlavour(current => ({ ...current, name: "" })))}>
              <Input label="New flavour" value={newFlavour.name} onChange={event => setNewFlavour(current => ({ ...current, name: event.target.value }))} />
              <label className="flex flex-col gap-1.5 text-sm font-medium">Price group
                <select className="h-12 rounded-sm border border-line-strong bg-surface px-3.5 text-base text-ink" value={newFlavour.group} onChange={event => setNewFlavour(current => ({ ...current, group: event.target.value }))}>
                  {catalogue.flavourGroups.map(group => <option key={group.key} value={group.key}>{group.name}</option>)}
                </select>
              </label>
              <Button variant="ghost" disabled={pending || !newFlavour.name.trim()}>Add flavour</Button>
            </form>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="font-semibold">Frostings</legend>
            <ul className="divide-y divide-line border-y border-line">
              {catalogue.frostings.map(item => <li key={item.key} className="flex min-h-12 items-center gap-3 py-2">
                <div className="min-w-0 flex-1 text-sm">{item.name}{!item.active && <span className="ml-2 text-ink-soft">Hidden</span>}
                  <RenameControl kind="frosting" itemKey={item.key} name={item.name} disabled={pending} onSave={runItemAction} />
                </div>
                <Button variant="ghost" disabled={pending} onClick={() => runItemAction({ kind: "frosting", operation: item.active ? "hide" : "show", key: item.key })}>{item.active ? "Hide" : "Show"}</Button>
              </li>)}
            </ul>
            <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={event => addItem(event, { kind: "frosting", operation: "add", name: newFrosting }, () => setNewFrosting(""))}>
              <Input label="New frosting" value={newFrosting} onChange={event => setNewFrosting(event.target.value)} />
              <Button variant="ghost" disabled={pending || !newFrosting.trim()}>Add frosting</Button>
            </form>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="font-semibold">Add-ons</legend>
            <form className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end" onSubmit={event => addItem(event, { kind: "addon", operation: "add", ...newAddon }, () => setNewAddon({ name: "", price: "1" }))}>
              <Input label="New add-on" value={newAddon.name} onChange={event => setNewAddon(current => ({ ...current, name: event.target.value }))} />
              <Input label="Price (ZMW)" inputMode="numeric" value={newAddon.price} onChange={event => setNewAddon(current => ({ ...current, price: event.target.value }))} />
              <Button variant="ghost" disabled={pending || !newAddon.name.trim()}>Add add-on</Button>
            </form>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="font-semibold">Dessert types</legend>
            <form className="grid gap-3 sm:grid-cols-[1fr_10rem_1fr_auto] sm:items-end" onSubmit={event => addItem(event, {
              kind: "dessert", operation: "add", name: newDessert.name, price: newDessert.price,
              flavourSuggestions: newDessert.flavourSuggestions.split(",").map(value => value.trim()).filter(Boolean),
            }, () => setNewDessert({ name: "", price: "1", flavourSuggestions: "" }))}>
              <Input label="New dessert type" value={newDessert.name} onChange={event => setNewDessert(current => ({ ...current, name: event.target.value }))} />
              <Input label="Price (ZMW)" inputMode="numeric" value={newDessert.price} onChange={event => setNewDessert(current => ({ ...current, price: event.target.value }))} />
              <Input label="Flavour suggestions" helper="Separate names with commas" value={newDessert.flavourSuggestions} onChange={event => setNewDessert(current => ({ ...current, flavourSuggestions: event.target.value }))} />
              <Button variant="ghost" disabled={pending || !newDessert.name.trim()}>Add dessert</Button>
            </form>
          </fieldset>
        </div>
      </Section>

      <Section id="sizes" label="Sizes">
        <form onSubmit={submitSizes} className="max-w-2xl space-y-4">
          <p className="text-sm text-ink-soft">Enter each size multiplier as a decimal, from 0.10 to 5.00.</p>
          <div className="divide-y divide-line border-y border-line">
            {catalogue.sizes.map(item => <div key={item.size} className="flex flex-wrap items-center gap-3 py-3">
              <span className="flex-1 text-sm font-medium">{item.size}-inch{!item.active && <span className="ml-2 text-ink-soft">Hidden</span>}</span>
              <Input className="w-36" label={`${item.size}-inch multiplier`} inputMode="decimal" value={prices.sizeMultipliers[String(item.size)] ?? ""}
                onChange={event => changeValue("sizeMultipliers", String(item.size), event.target.value)}
                error={priceError(`sizeMultipliers.${item.size}`)} />
              <Button variant="ghost" disabled={pending} onClick={() => runItemAction({ kind: "size", operation: item.active ? "hide" : "show", size: item.size })}>{item.active ? "Hide" : "Show"}</Button>
            </div>)}
          </div>
          {resultScope === "sizes" && <ResultMessage result={result} success="Size multipliers saved." />}
          <Button variant="ghost" type="submit" disabled={pending}>{pending ? "Saving…" : "Save sizes"}</Button>
        </form>
      </Section>

      <Section id="rules" label="Fees and rules">
        <form onSubmit={event => submitSettings(event, saveFeesAndRules, ruleValues, "rules")} className="grid max-w-3xl gap-4 sm:grid-cols-2">
          {ruleFields.map(([key, label]) => <div key={key}><Input label={label} inputMode="numeric" value={ruleValues[key]} onChange={event => { setResult(null); setRuleValues(current => ({ ...current, [key]: event.target.value })); }} error={priceError(key)} /><UpdatedAt value={updatedAt[key]} /></div>)}
          {resultScope === "rules" && <ResultMessage result={result} success="Fees and rules saved." />}
          <Button variant="ghost" type="submit" disabled={pending}>{pending ? "Saving…" : "Save fees and rules"}</Button>
        </form>
      </Section>
      <Section id="windows" label="Time windows">
        <form onSubmit={event => submitSettings(event, saveTimeWindows, timeValues, "windows")} className="grid max-w-3xl gap-4 sm:grid-cols-2">
          {timeFields.map(([key, label]) => <div key={key}><Input label={label} type="time" value={timeValues[key]} onChange={event => { setResult(null); setTimeValues(current => ({ ...current, [key]: event.target.value })); }} error={priceError(key)} /><UpdatedAt value={updatedAt[key]} /></div>)}
          {resultScope === "windows" && <ResultMessage result={result} success="Time windows saved." />}
          <Button variant="ghost" type="submit" disabled={pending}>{pending ? "Saving…" : "Save time windows"}</Button>
        </form>
      </Section>
      <Section id="payment" label="Payment and contact">
        <form onSubmit={event => submitSettings(event, savePaymentAndContact, paymentValues, "payment")} className="grid max-w-3xl gap-4 sm:grid-cols-2">
          {paymentFields.map(([key, label]) => <div key={key}><Input label={label} type={key === "pickup_map_url" ? "url" : "tel"} value={paymentValues[key]} onChange={event => { setResult(null); setPaymentValues(current => ({ ...current, [key]: event.target.value })); }} error={priceError(key)} /><UpdatedAt value={updatedAt[key]} /></div>)}
          {resultScope === "payment" && <ResultMessage result={result} success="Payment and contact details saved." />}
          <Button variant="ghost" type="submit" disabled={pending}>{pending ? "Saving…" : "Save payment and contact"}</Button>
        </form>
      </Section>
    </div>
  </main>;
}
