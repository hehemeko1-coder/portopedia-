"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

export function VerifyEmail({ token }: { token: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("Verifying your email address…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let redirectTimer: number | undefined;
    apiRequest("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token })
    }).then(() => {
      if (active) {
        setMessage("Your email is verified. Your creator workspace is ready.");
        redirectTimer = window.setTimeout(() => router.push("/dashboard"), 1200);
      }
    }).catch((error: unknown) => {
      if (!active) return;
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "This verification link is invalid or expired.");
    });
    return () => { active = false; if (redirectTimer) window.clearTimeout(redirectTimer); };
  }, [token, router]);

  return (
    <main className="auth-page">
      <header className="auth-header"><Link className="wordmark" href="/">porto<span>pedia</span><b>.</b></Link><span className="eyebrow">ACCOUNT VERIFICATION</span></header>
      <section className="auth-panel">
        <p className="eyebrow">PORTOPEDIA / EMAIL</p>
        <h1>{failed ? "LINK NOT VALID." : "ONE LAST STEP."}</h1>
        <p className={failed ? "form-error" : "form-success"} role="status">{message}</p>
        {failed && <Link className="button-primary" href="/login">Return to sign in</Link>}
      </section>
    </main>
  );
}
