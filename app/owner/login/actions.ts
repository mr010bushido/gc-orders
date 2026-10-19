"use server";

import { headers } from "next/headers";
import { requestOwnerLogin } from "../../../lib/auth/login-request";
import { supabaseOwnerAuth } from "../../../lib/platform/adapters/supabase/owner-auth";

export async function sendOwnerLoginLink(formData: FormData) {
  const requestHeaders = await headers();
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) return { state: "not-configured" as const };
  const state = await requestOwnerLogin(formData.get("email"), requestHeaders, `${protocol}://${host}`, { auth: supabaseOwnerAuth });
  return { state };
}
