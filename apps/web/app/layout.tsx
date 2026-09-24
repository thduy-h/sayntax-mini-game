import type { Metadata } from "next";
import Script from "next/script";
import { GlobalCommandBar } from "@/features/voice-control/components/global-command-bar";
import { GlobalCommandProvider } from "@/features/voice-control/components/global-command-context";
import { GlobalVoiceControl } from "@/features/voice-control/components/global-voice-control";
import "./globals.css";

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
          <GlobalVoiceControl />
          <GlobalCommandBar />
        </GlobalCommandProvider>
      </body>
    </html>
  );
}
