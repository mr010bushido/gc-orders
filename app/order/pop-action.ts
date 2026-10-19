"use server";

import { submitPopAction as submit } from "./actions";

export type PopActionResult = { ok: true; status: "awaiting_verification" } | { ok: false; error: string; stale?: true };
export async function submitPopAction(token: string, _previous: PopActionResult | null, formData: FormData): Promise<PopActionResult> {
  return submit(token, String(formData.get("text") ?? ""));
}
