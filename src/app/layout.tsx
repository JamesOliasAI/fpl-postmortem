import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL || "https://fpl-postmortem.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "FPL Post-Mortem — How did your season REALLY go?",
  description:
    "Free, brutally honest FPL season report. See the points you left on your bench, what your hits cost you, and whether you just played the template. Enter your Team ID.",
  openGraph: {
    title: "FPL Post-Mortem — How did your season REALLY go?",
    description:
      "See the points you left on your bench, what your hits cost you, and whether you played the template.",
    type: "website",
    url: SITE,
  },
  twitter: {
    card: "summary_large_image",
    title: "FPL Post-Mortem — How did your season REALLY go?",
    description:
      "Free, brutally honest FPL season report. Enter your Team ID and find out.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0a0a1f] text-white">
        {children}
      </body>
    </html>
  );
}
