import { env } from "../config/env.js";

type EmailMessage = {
  to: { email: string; name?: string };
  subject: string;
  htmlContent: string;
  textContent: string;
};

export const isEmailDeliveryConfigured = Boolean(
  env.BREVO_API_KEY &&
  env.BREVO_SENDER_EMAIL
);

export async function sendTransactionalEmail(message: EmailMessage): Promise<void> {
  const apiKey = env.BREVO_API_KEY;
  const senderEmail = env.BREVO_SENDER_EMAIL;
  if (!apiKey || !senderEmail) {
    throw new Error("Brevo email delivery is not configured.");
  }

  const senderName = env.BREVO_SENDER_NAME;
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": apiKey,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [message.to],
      subject: message.subject,
      htmlContent: message.htmlContent,
      textContent: message.textContent
    }),
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    const diagnostic = await response.text().catch(() => "");
    throw new Error(`Brevo rejected the email request with status ${response.status}: ${diagnostic.slice(0, 300)}`);
  }
}
