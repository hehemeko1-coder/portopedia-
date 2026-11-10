import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/password-recovery";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
