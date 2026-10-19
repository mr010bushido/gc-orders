import { NextResponse, type NextRequest } from "next/server";
import { refreshSupabaseSession } from "./lib/platform/adapters/supabase/proxy-session";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/owner/login" || path.startsWith("/owner/auth/callback")) return NextResponse.next();
  return refreshSupabaseSession(request);
}

export const config = { matcher: "/owner/:path*" };
