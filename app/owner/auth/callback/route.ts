import { NextResponse } from "next/server";
import { supabaseOwnerAuth } from "../../../../lib/platform/adapters/supabase/owner-auth";

function redirect(request: Request, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url));
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: Request) {
  try {
    const incoming = new URL(request.url);
    const params = incoming.searchParams;
    params.set("cookie", request.headers.get("cookie") ?? "");
    const completed = await supabaseOwnerAuth.completeLogin(params);
    if (!completed) return redirect(request, "/owner/login?error=link");
    const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
    if (!ownerEmail || completed.email.toLowerCase() !== ownerEmail) {
      await supabaseOwnerAuth.signOut(new Headers({ cookie: request.headers.get("cookie") ?? "" }));
      return redirect(request, "/owner/login?error=link");
    }
    return redirect(request, "/owner/orders");
  } catch {
    return redirect(request, "/owner/login?error=link");
  }
}
