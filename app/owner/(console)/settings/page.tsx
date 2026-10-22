import { requireOwner } from "../../../../lib/auth/require-owner";
import { getDb } from "../../../../lib/db";
import { settings } from "../../../../lib/db/schema";
import { getCatalogue } from "../../../../lib/catalogue/catalogue";
import type { SettingKey } from "../../../../lib/catalogue/settings";
import { SettingsManager } from "./settings-manager";

export default async function SettingsPage() {
  await requireOwner();
  const db = getDb();
  const [catalogue, settingRows] = await Promise.all([
    getCatalogue(db, { includeInactive: true }),
    db.select({ key: settings.key, updatedAt: settings.updatedAt }).from(settings),
  ]);
  const updatedAt = Object.fromEntries(settingRows.map(({ key, updatedAt }) => [key, updatedAt.toISOString()])) as Partial<Record<SettingKey, string>>;
  const catalogueVersion = JSON.stringify([
    catalogue.flavourGroups, catalogue.flavours, catalogue.frostings, catalogue.sizes,
    catalogue.addons, catalogue.dessertTypes, catalogue.settings, updatedAt,
  ]);
  return <SettingsManager key={catalogueVersion} catalogue={catalogue} updatedAt={updatedAt} />;
}
