"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireOwner } from "../../lib/auth/require-owner";
import { supabaseOwnerAuth } from "../../lib/platform/adapters/supabase/owner-auth";

export async function signOutOwner() {
  await requireOwner();
  await supabaseOwnerAuth.signOut(await headers());
  redirect("/owner/login");
}
