import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Owner sign in | Giuseppe’s Cakes", robots: { index: false, follow: false } };

export default async function OwnerLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const configured = Boolean(process.env.OWNER_EMAIL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return <main className="flex min-h-screen items-center justify-center bg-bg px-5 py-12 text-ink sm:px-8">
    <LoginForm configured={configured} linkError={error === "link"} />
  </main>;
}
