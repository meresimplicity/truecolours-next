import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";

// NOTE: if you're dropping /find-my-colour into an existing Next.js app,
// you almost certainly already have a root layout — merge the font
// declarations and the CSS variables below into it instead of using this
// file, and delete this one. This exists only so the starter runs standalone.

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Find My Colour — TRUECOLOURS",
  description: "Look up your vehicle's factory paint colour by manufacturer, model, and year.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${inter.variable} font-body bg-paper text-ink`}>{children}</body>
    </html>
  );
}
