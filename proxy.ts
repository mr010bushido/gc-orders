import { NextResponse, type NextRequest } from "next/server";

function hasSessionCookie(request: NextRequest): boolean {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!projectUrl) return false;
  let project: string;
  try {
    project = new URL(projectUrl).hostname.split(".")[0];
  } catch {
    return false;
  }
  return request.cookies.getAll().some(({ name }) => name.startsWith(`sb-${project}-auth-token`));
}

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/owner/login" || path.startsWith("/owner/auth/callback")) return NextResponse.next();
  if (hasSessionCookie(request)) return NextResponse.next();
  return NextResponse.redirect(new URL("/owner/login", request.url));
}

export const config = { matcher: "/owner/:path*" };
