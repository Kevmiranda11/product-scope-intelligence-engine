import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { ScopeProvider } from "../lib/scope-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0F1115] text-[#E5E7EB]`}
      >
        <ScopeProvider>
          <div className="flex h-screen overflow-hidden">
          
          {/* Sidebar */}
          <aside className="w-64 shrink-0 border-r border-[#262C36] bg-[#151922]">
            <Sidebar />
          </aside>

          {/* Main Area */}
          <div className="flex-1 flex flex-col bg-[#0F1115]">
            
            {/* Topbar */}
            <header className="h-16 shrink-0 border-b border-[#262C36] bg-[#151922] px-6 flex items-center justify-between">
              <Topbar />
            </header>

            {/* Scrollable Content */}
            <main className="flex-1 overflow-auto p-8 bg-[#0F1115]">
              {children}
            </main>

          </div>
        </div>
        </ScopeProvider>
      </body>
    </html>
  );
}