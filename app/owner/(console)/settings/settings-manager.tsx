"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Button } from "../../../../components/ui/Button";
import { Input } from "../../../../components/ui/Input";
import type { FullCatalogue } from "../../../../lib/catalogue/catalogue";
import { manageCatalogueItem, savePrices, type CatalogueItemAction, type SettingsActionResult } from "./actions";
import { SettingsNotice } from "./settings-notice";

type PriceValues = {
  flavourGroupPrices: Record<string, string>;
  addonPrices: Record<string, string>;
  dessertPrices: Record<string, string>;
  sizeMultipliers: Record<string, string>;
};

type Props = { catalogue: FullCatalogue };

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
    <form className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={event => {
      event.preventDefault();
      onSave({ kind, operation: "rename", key: itemKey, name: value });
    }}>
      <Input label="Name" value={value} onChange={event => setValue(event.target.value)} />
      <Button variant="ghost" disabled={disabled || !value.trim()}>Save name</Button>
    </form>
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
    <form className="mt-2 flex flex-col gap-2" onSubmit={event => {
      event.preventDefault();
      onSave({ kind: "dessert", operation: "suggestions", key: itemKey, flavourSuggestions: value.split(",").map(item => item.trim()).filter(Boolean) });
    }}>
      <Input label="Flavour suggestions" helper="Separate names with commas" value={value} onChange={event => setValue(event.target.value)} />
      <Button variant="ghost" disabled={disabled}>Save flavours</Button>
    </form>
  </details>;
}

export function SettingsManager({ catalogue }: Props) {
  const [pending, startTransition] = useTransition();
  const [prices, setPrices] = useState(() => priceValues(catalogue));
  const [result, setResult] = useState<SettingsActionResult | null>(null);
  const [newFlavour, setNewFlavour] = useState({ name: "", group: catalogue.flavourGroups[0]?.key ?? "", diet: "standard" });
  const [newFrosting, setNewFrosting] = useState("");
  const [newAddon, setNewAddon] = useState({ name: "", price: "1" });
  const [newDessert, setNewDessert] = useState({ name: "", price: "1", flavourSuggestions: "" });

  const changeValue = (field: keyof PriceValues, key: string, value: string) => {
    setPrices(current => ({ ...current, [field]: { ...current[field], [key]: value } }));
  };

  const submitPrices = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const next = await savePrices({ ...prices, sizeMultipliers: {} });
      setResult(next);
    });
  };

  const submitSizes = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const next = await savePrices({ flavourGroupPrices: {}, addonPrices: {}, dessertPrices: {}, sizeMultipliers: prices.sizeMultipliers });
      setResult(next);
    });
  };

  const runItemAction = (input: CatalogueItemAction) => {
    startTransition(async () => {
      const next = await manageCatalogueItem(input);
      setResult(next);
    });
  };

  const addItem = (event: FormEvent<HTMLFormElement>, input: CatalogueItemAction, reset: () => void) => {
    event.preventDefault();
    startTransition(async () => {
      const next = await manageCatalogueItem(input);
      setResult(next);
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
          <ResultMessage result={result} success="Prices saved. They apply to new bookings." />
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
          <ResultMessage result={result} success="Catalogue item updated." />
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
          <ResultMessage result={result} success="Size multipliers saved." />
          <Button variant="ghost" type="submit" disabled={pending}>{pending ? "Saving…" : "Save sizes"}</Button>
        </form>
      </Section>

      <Section id="rules" label="Fees and rules"><p className="text-sm text-ink-soft">Settings will appear here.</p></Section>
      <Section id="windows" label="Time windows"><p className="text-sm text-ink-soft">Settings will appear here.</p></Section>
      <Section id="payment" label="Payment and contact"><p className="text-sm text-ink-soft">Settings will appear here.</p></Section>
    </div>
  </main>;
}
