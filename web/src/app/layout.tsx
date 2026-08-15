import type { Metadata } from "next";
import AppProviders from "../components/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://bootybank.app"),
  title: "Booty Bank — Borrow Against Your BBL",
  description: "Private creator banking with Falcon-512 post-quantum account authorization on Starknet.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "BOOTY BANK",
    description: "BORROW AGAINST YOUR BBL. PRIVATE MONEY. POST-QUANTUM AUTH.",
    url: "/",
    siteName: "Booty Bank",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Booty Bank — Borrow Against Your BBL" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BOOTY BANK",
    description: "BORROW AGAINST YOUR BBL. PRIVATE MONEY. POST-QUANTUM AUTH.",
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
