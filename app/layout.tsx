import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
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
  weight: ["400"],
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
    >
      <body>
        <CartHydrator />
        <SmoothScroll />
        <Header />
        <main id="main" className="pt-[var(--header-h)]">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
