import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LLR Reader",
  description: "Next.js RSS Reader",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="dns-prefetch" href="/export.xml" />
      </head>
      <body className="h-screen flex flex-col overflow-hidden">
        <header className="bg-[#fae7ca] text-black px-4 py-2 flex-shrink-0 shadow-md z-10 flex items-center gap-2">
          <img src="/favicon.svg" alt="LLR Logo" className="w-6 h-6" />
          <h1 className="text-lg font-bold tracking-tight">LLR</h1>
        </header>

        <div className="flex-1 overflow-hidden relative">{children}</div>

        <footer className="bg-gray-100 border-t border-gray-300 px-4 py-1 text-xs text-gray-600 flex-shrink-0 flex justify-between items-center">
          <span>&copy; 2024-{new Date().getFullYear()} LLR Reader</span>
          <span>Author: Arc Cosine</span>
        </footer>
      </body>
    </html>
  );
}
