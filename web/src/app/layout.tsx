import "./globals.css";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "OpenClaw on OpenShift — Red Hat × NVIDIA Workshop",
  description: "Hands-on lab — build a sandboxed AI agent (Shifty 🦞) with NVIDIA OpenShell on Red Hat OpenShift, with a live shell, then run an SRE agent fleet on a real incident.",
};

// Self-hosted at build time by next/font: no request to Google Fonts from the attendee's browser.
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800"], variable: "--font-inter", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-jetbrains-mono", display: "swap" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{document.documentElement.dataset.theme=localStorage.getItem('oclaw-theme')||'dark';}catch(e){}` }} />
      </head>
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
