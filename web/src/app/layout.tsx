import type { Metadata } from "next";
import AppProviders from "../components/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://bootybank.app"),
  title: "Booty Bank — Borrow Against Your BBL",
  description:
    "The account that can't dump you. Self-custody, a lender packet for creator income, private by default. Post-quantum durability underneath.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "BOOTY BANK",
    description: "THE ACCOUNT THAT CAN'T DUMP YOU. BORROW AGAINST YOUR BBL.",
    url: "/",
    siteName: "Booty Bank",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Booty Bank — Borrow Against Your BBL" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BOOTY BANK",
    description: "THE ACCOUNT THAT CAN'T DUMP YOU. BORROW AGAINST YOUR BBL.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><AppProviders>{children}</AppProviders></body>
    </html>
  );
}
