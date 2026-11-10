import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "./pwa-register";

export const metadata: Metadata = {
  title: {
    default: "Portopedia — Your work, unmistakably yours",
    template: "%s — Portopedia"
  },
  description: "A home for independent creators to present their work, shape their identity, and publish a portfolio on their own terms.",
  applicationName: "Portopedia",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon.svg" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Portopedia" },
  openGraph: {
    title: "Portopedia — Your work, unmistakably yours",
    description: "A home for independent creators to present and publish their work.",
    type: "website"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4f1e9"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light">
      <body><PwaRegister />{children}</body>
    </html>
  );
}
