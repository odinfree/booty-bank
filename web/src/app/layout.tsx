import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Booty Bank / Working Prototype",
  description: "The private primary money account for OnlyFans creators: spend, exchange, save, invest, earn, and borrow with post-quantum account authorization.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
