import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Private Creator Account / Working Prototype",
  description: "Consented income evidence and private credit eligibility for adult creators.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
