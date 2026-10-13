import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0d5c46",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "ytChaptered — YouTube Timestamped Chapter Playlist Creator",
  description: "Turn long, timestamped YouTube videos into an interactive chaptered playlist.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ytChaptered",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#fafaf9] text-[#1c1917]">
        {children}
      </body>
    </html>
  );
}
