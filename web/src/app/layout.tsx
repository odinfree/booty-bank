import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Private Account for OnlyFans Creators / Working Prototype",
  description: "Private income evidence and credit eligibility for OnlyFans creators.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
