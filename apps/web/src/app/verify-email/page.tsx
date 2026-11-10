import type { Metadata } from "next";
import { VerifyEmail } from "@/components/verify-email";

export const metadata: Metadata = { title: "Verify your email" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) return <main className="auth-page"><section className="auth-panel"><h1>INVALID LINK.</h1><p className="form-error">This verification link is missing its token.</p></section></main>;
  return <VerifyEmail token={token} />;
}
