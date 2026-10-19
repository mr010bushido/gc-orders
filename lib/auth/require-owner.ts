import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseOwnerAuth } from "../platform/adapters/supabase/owner-auth";
import type { Owner, OwnerAuth } from "../platform/owner-auth";

export async function ownerForRequest(
  auth: OwnerAuth,
  requestHeaders: Headers,
  ownerEmail = process.env.OWNER_EMAIL,
): Promise<Owner | null> {
  if (!ownerEmail?.trim()) return null;
  // Any adapter failure (unconfigured, malformed cookie, outage) counts as signed out.
  const owner = await auth.getOwner(requestHeaders).catch(() => null);
  return owner?.email.toLowerCase() === ownerEmail.trim().toLowerCase() ? owner : null;
}

export async function requireOwner(): Promise<Owner> {
  const requestHeaders = await headers();
  const owner = await ownerForRequest(supabaseOwnerAuth, requestHeaders);
  if (!owner) redirect("/owner/login");
  return owner;
}
