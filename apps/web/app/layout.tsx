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
  description: "SAYNTAX giúp người mới học lập trình bằng giọng nói tiếng Việt, nhập lệnh hoặc kéo thả khối. Công nghệ không rào cản.",
  openGraph: {
    title: "SAYNTAX - Công nghệ không rào cản",
    description: "Học lập trình bằng giọng nói, nhập lệnh hoặc kéo thả khối, từng bước dễ theo.",
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
        <GlobalCommandProvider>
          {children}
          <footer className="scc-site-footer mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm font-semibold text-black sm:px-10">
            <span>SAYNTAX · Công nghệ không rào cản</span>
            <Link className="inline-flex min-h-11 items-center underline underline-offset-4 focus-visible:outline-4 focus-visible:outline-[#0052cc]" href="/privacy">Quyền riêng tư</Link>
          </footer>
          <GlobalVoiceControl />
          <GlobalCommandBar />
        </GlobalCommandProvider>
      </body>
    </html>
  );
}
