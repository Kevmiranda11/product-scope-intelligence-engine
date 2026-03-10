import type { Metadata } from "next";
import "./globals.css";

import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Product Scope Intelligence Engine",
  description: "Versioned Product Scope Workspace",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-[#0F1115] text-[#E5E7EB]">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
