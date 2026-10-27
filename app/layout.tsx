import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { getSessionUser } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "BOAT — Bicycle Ownership and Address Tag",
  description: "Campus bicycle plates with NFC ownership lookup and community location tracking.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser().catch(() => null);

  return (
    <html lang="en">
      <body className={`${sans.variable} ${display.variable} font-sans`}>
        <Navbar user={user} />
        <main className="mx-auto min-h-[calc(100vh-72px)] max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
