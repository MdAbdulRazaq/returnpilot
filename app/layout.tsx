import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReturnPilot — Catch refund leaks on Shopify",
  description:
    "ReturnPilot flags refunds issued without a confirmed received return, so you stop losing money on returns that never arrive.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
