import type { Metadata, Viewport } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Bebas_Neue, Inter, Geist_Mono } from "next/font/google";
import { ORGANIZATION_JSON_LD } from "@/lib/organization";
import PageViewTracker from "@/components/analytics/PageViewTracker";
import SiteChrome from "@/components/SiteChrome";
import { CartProvider } from "@/components/cart/CartProvider";
import { SITE_URL } from "@/lib/site";
import { GA_MEASUREMENT_ID } from "@/lib/analytics";
import "./globals.css";

const bebas = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DESCRIPTION =
  "Shop WHOA, and share it — join the ambassador program, give your people 15% off, and earn 10% commission on every sale.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: "%s | WHOA",
    default: "WHOA",
  },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "WHOA",
    title: "WHOA",
    description: DESCRIPTION,
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "WHOA",
    description: DESCRIPTION,
    images: ["/opengraph-image"],
  },
  // Site verification. Through metadata rather than a hand-written tag in
  // the head, so it lands on every page and survives any change to the
  // layout's markup. Pinterest only reads it on the homepage, but a claim
  // tag that exists in exactly one place is a claim that breaks the day
  // someone edits that place.
  verification: {
    other: {
      "p:domain_verify": "204421e31845d4a4bb02d3fc4ddaa2a0",
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0806",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bebas.variable} ${inter.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {/* Who WHOA is, once, site-wide. Google and the AI crawlers both
            use this to tie every product, review and mention back to one
            brand rather than treating each page as an unrelated site.
            Only facts the site states elsewhere are in here: the phone
            number is the one on /contact, the email the one in the
            footer of every email we send. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: ORGANIZATION_JSON_LD }}
        />
        {/* Outside SiteChrome so the immersive routes that opt out of the
            navbar — /, /pos, /oasis, /water, /go — are still counted. */}
        <PageViewTracker />
        <CartProvider>
          <SiteChrome>{children}</SiteChrome>
        </CartProvider>
      </body>
      {GA_MEASUREMENT_ID && <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />}
    </html>
  );
}
