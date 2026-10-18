import type { Metadata, Viewport } from "next";
import Script from "next/script";
import Link from "next/link";
import { GlobalCommandBar } from "@/features/voice-control/components/global-command-bar";
import { GlobalCommandProvider } from "@/features/voice-control/components/global-command-context";
import { GlobalVoiceControl } from "@/features/voice-control/components/global-voice-control";
import "./globals.css";

export const metadata: Metadata = {
  ...(process.env.NEXT_PUBLIC_SITE_URL ? { metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL) } : {}),
  title: {
    default: "SAYNTAX - Công nghệ không rào cản",
    template: "%s | SAYNTAX",
  },
  description: "SAYNTAX giúp người mới học lập trình bằng giọng nói tiếng Việt hoặc kéo thả khối lệnh Blockly. Công nghệ không rào cản.",
  openGraph: {
    title: "SAYNTAX - Công nghệ không rào cản",
    description: "Học lập trình bằng giọng nói hoặc kéo thả khối, từng bước dễ theo.",
    siteName: "SAYNTAX",
    type: "website",
    images: [{ url: "/brand/sayntax-v2-primary-horizontal.png", alt: "SAYNTAX - Công nghệ không rào cản" }],
  },
  robots: { index: true, follow: true },
  icons: {
    apple: "/brand/sayntax-v2-app-icon-1024.png",
    icon: "/brand/sayntax-v2-favicon-512.png",
  },
};

export const viewport: Viewport = { themeColor: "#fff8da", width: "device-width", initialScale: 1 };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <Script
          id="scc-remove-extension-hydration-noise"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function removeExtensionHydrationNoise() {
                function clean() {
                  document.getElementById("MathJax_Message")?.remove();
                }
                clean();
                if (document.readyState === "loading") {
                  document.addEventListener("DOMContentLoaded", clean, { once: true });
                }
              })();
            `,
          }}
        />
      </head>
      {/*
        Some browser extensions inject nodes such as #MathJax_Message before
        hydration. The cleanup script above removes the known injected node;
        suppressHydrationWarning keeps extension-only DOM noise from masking
        real app behavior during demos.
      */}
      <body suppressHydrationWarning className="antialiased">
        <a
          href="#voice-activation"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[9999] focus:rounded-xl focus:border-2 focus:border-black focus:bg-[#ff5f87] focus:px-4 focus:py-3 focus:text-sm focus:font-black focus:text-black focus:shadow-[4px_4px_0_#121212] focus:outline-none focus:ring-4 focus:ring-[#0052cc]"
        >
          Nhấn Enter để kích hoạt điều khiển bằng giọng nói
        </a>
        <GlobalCommandProvider>
          {children}
          <footer className="scc-site-footer mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 border-t-2 border-black/15 px-6 pt-6 pb-20 sm:px-8 sm:pt-6 sm:pb-24 text-xs sm:text-sm font-semibold text-zinc-700">
            <div className="flex flex-wrap items-center gap-4">
              <span>© SAYNTAX — Nền tảng học lập trình không rào cản.</span>
              <Link className="underline decoration-1 underline-offset-4 hover:text-black focus-visible:outline-4 focus-visible:outline-[#0052cc]" href="/voice-guide">
                Hướng dẫn lệnh
              </Link>
              <Link className="underline decoration-1 underline-offset-4 hover:text-black focus-visible:outline-4 focus-visible:outline-[#0052cc]" href="/privacy">
                Quyền riêng tư
              </Link>
            </div>
            <p className="text-xs text-zinc-600">Hỗ trợ nhận dạng giọng nói tiếng Việt · Blockly 12</p>
          </footer>
          <GlobalVoiceControl />
          <GlobalCommandBar />
        </GlobalCommandProvider>
      </body>
    </html>
  );
}
