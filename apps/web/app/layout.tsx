import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";

const headingFont = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
});

const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SheCanCode Voice",
  description:
    "Nền tảng học lập trình khối ưu tiên trợ năng, có hỗ trợ giọng nói cho nữ sinh khuyết tật vận động.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      {/*
        suppressHydrationWarning on <body> silences the React hydration
        mismatch that browser extensions trigger when they inject nodes
        (e.g. "TeX All the Things" / MathJax) before hydration runs. The
        warning is cosmetic in that case — our own markup is stable.
      */}
      <body
        suppressHydrationWarning
        className={`${headingFont.variable} ${bodyFont.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
