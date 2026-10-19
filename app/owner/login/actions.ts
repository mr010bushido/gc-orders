"use server";

import { headers } from "next/headers";
import { loginOrigin, requestOwnerLogin } from "../../../lib/auth/login-request";
import { supabaseOwnerAuth } from "../../../lib/platform/adapters/supabase/owner-auth";

export async function sendOwnerLoginLink(formData: FormData) {
  const requestHeaders = await headers();
  const origin = loginOrigin(requestHeaders);
  if (!origin) return { state: "not-configured" as const };
  const state = await requestOwnerLogin(formData.get("email"), requestHeaders, origin, { auth: supabaseOwnerAuth });
  return { state };
}
