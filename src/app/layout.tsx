import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "sgbus — Singapore bus tracker",
  description: "Live bus arrivals, nearby stops, and a live map for Singapore.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "sgbus",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-dvh flex flex-col bg-zinc-950 text-zinc-100">
        <header className="sticky top-0 z-30 border-b border-zinc-900/80 bg-zinc-950/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/15 text-emerald-300">
                <span className="text-sm font-semibold">sg</span>
              </span>
              <span className="text-base font-semibold tracking-tight">
                sgbus
              </span>
            </Link>
            <span className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              live
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-28 pt-4">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
