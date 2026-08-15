import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://bootybank.app"),
  title: "Booty Bank / Working Prototype",
  description: "The private primary money account for OnlyFans creators: spend, exchange, save, invest, earn, and borrow with post-quantum account authorization.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Booty Bank / Working Prototype",
    description: "The private primary money account for OnlyFans creators.",
    url: "/",
    siteName: "Booty Bank",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
