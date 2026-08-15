import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Booty Bank / Working Prototype",
  description: "The private money account and income-based credit concept for OnlyFans creators.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
