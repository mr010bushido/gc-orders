import { requireOwner } from "../../../../lib/auth/require-owner";
import { getDb } from "../../../../lib/db";
import { getCatalogue } from "../../../../lib/catalogue/catalogue";
import { SettingsManager } from "./settings-manager";

export default async function SettingsPage() {
  await requireOwner();
  const catalogue = await getCatalogue(getDb(), { includeInactive: true });
  const catalogueVersion = JSON.stringify([
    catalogue.flavourGroups, catalogue.flavours, catalogue.frostings, catalogue.sizes,
    catalogue.addons, catalogue.dessertTypes, catalogue.settings,
  ]);
  return <SettingsManager key={catalogueVersion} catalogue={catalogue} />;
}
