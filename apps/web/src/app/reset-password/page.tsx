import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/password-recovery";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) return <main className="auth-page"><section className="auth-panel"><h1>INVALID LINK.</h1><p className="form-error">This password reset link is missing its token.</p></section></main>;
  return <ResetPasswordForm token={token} />;
}
