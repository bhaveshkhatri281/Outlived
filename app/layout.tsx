import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { Cursor } from "@/components/layout/Cursor";
import { EntryGate } from "@/components/layout/EntryGate";
import { PageTransition } from "@/components/layout/PageTransition";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { HoverGL } from "@/components/layout/HoverGL";
import { RevealObserver } from "@/components/layout/RevealObserver";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { Toast } from "@/components/ui/Toast";
import { SITE } from "@/data/site";
import { CartHydrator } from "@/lib/store/cart";
import "./globals.css";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  display: "swap",
  preload: false,
});

// Runs before first paint. Decides the entry gate up front, so the page is either covered in --ink
// (gate pending) or shown normally; the homepage never flashes before the gate. ?gate=1 forces it.
const GATE_SCRIPT = `(function(){var d=document.documentElement;d.classList.add("js");var force=location.search.indexOf("gate=1")>-1;var bot=/bot|crawl|spider|slurp|lighthouse|headless|prerender/i.test(navigator.userAgent);var seen=false;try{seen=!!sessionStorage.getItem("outlived:entered")}catch(e){}if(force||(!bot&&!seen))d.dataset.gate="pending"})()`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "OUTLIVED — Built to outlive",
    template: "%s · OUTLIVED",
  },
  description: SITE.description,
  openGraph: {
    type: "website",
    siteName: "OUTLIVED",
    locale: "en_IN",
  },
};

export const viewport: Viewport = {
  themeColor: SITE.themeColor,
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en-IN"
      data-theme="dark"
      className={`${interTight.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Before first paint: mark JS as available (reveals never hide content without it), and
            cover the page for the entry ritual on a human's first visit (never for crawlers). */}
        <script dangerouslySetInnerHTML={{ __html: GATE_SCRIPT }} />
      </head>
      <body>
        <CartHydrator />
        <SmoothScroll />
        <RevealObserver />
        <Header />
        <main id="main" className="pt-[var(--header-h)]">
          {children}
        </main>
        <Footer />
        <HoverGL />
        <PageTransition />
        {/* Cursor mounts before the gate and sits above it (z 300 vs 200). */}
        <Cursor />
        <EntryGate />
        <Toast />
      </body>
    </html>
  );
}
