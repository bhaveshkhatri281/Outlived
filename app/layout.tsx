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

const GATE_SCRIPT = `(function(){var d=document.documentElement;d.classList.add("js");try{var q=location.search;var bot=/bot|crawl|spider|slurp|lighthouse|headless|prerender/i.test(navigator.userAgent);if(q.indexOf("gate=1")>-1||(!bot&&!localStorage.getItem("outlived-entered")))d.dataset.gate="pending"}catch(e){}})()`;

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
        <EntryGate />
        <Cursor />
        <Toast />
      </body>
    </html>
  );
}
