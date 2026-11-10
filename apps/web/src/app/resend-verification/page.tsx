import type { Metadata } from "next";
import { ResendVerificationForm } from "@/components/password-recovery";

export const metadata: Metadata = { title: "Resend verification email" };

export default function ResendVerificationPage() {
  return <ResendVerificationForm />;
}
