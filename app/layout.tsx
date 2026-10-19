import type { Metadata } from "next";
import localFont from "next/font/local";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { QueryProvider } from "@/lib/providers/QueryProvider";
import { siteConfig } from "@/config/site";
import MotionProvider from "@/components/MotionProvider";
import "./globals.css";
import "./public-site.css";

const publicSans = localFont({ src: "../public/fonts/geist-latin.woff2", weight: "100 900", variable: "--font-public-sans", display: "swap" });
const publicMono = localFont({ src: "../public/fonts/geist-mono-latin.woff2", weight: "100 900", variable: "--font-public-mono", display: "swap" });

const inter = localFont({
  src: "../public/fonts/inter-latin.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
});

const barlowCondensed = localFont({
  src: [
    { path: "../public/fonts/barlow-condensed-600.woff2", weight: "600" },
    { path: "../public/fonts/barlow-condensed-700.woff2", weight: "700" },
    { path: "../public/fonts/barlow-condensed-800.woff2", weight: "800" },
    { path: "../public/fonts/barlow-condensed-900.woff2", weight: "900" },
  ],
  variable: "--font-barlow-condensed",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: "TRUECOLOURS - Automotive & Industrial Paints",
  description:
    `${siteConfig.legalName} (${siteConfig.registrationNumber}) is a registered South African private company supplying automotive and industrial paints in Mankweng, Limpopo.`,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.legalName }],
  creator: siteConfig.legalName,
  publisher: siteConfig.legalName,
  keywords: ["TRUECOLOURS", "TRUECOLOURS PAINTS AND CONSTRUCTION", "automotive paints", "industrial paints", "Mankweng", "Limpopo", siteConfig.registrationNumber],
  alternates: { canonical: "/" },
  other: {
    "company:legal_name": siteConfig.legalName,
    "company:registration_number": siteConfig.registrationNumber,
    "company:registration_date": siteConfig.registrationDate,
    "company:business_start_date": siteConfig.businessStartDate,
    "company:enterprise_type": siteConfig.enterpriseType,
    "company:enterprise_status": siteConfig.enterpriseStatus,
    "company:financial_year_end": siteConfig.financialYearEnd,
    "company:annual_return_filed_at": siteConfig.annualReturnFiledAt,
    "company:registered_office": siteConfig.registeredOffice.oneLine,
  },
  icons: {
    icon: [
      { url: "/pwa-icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/pwa-icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/pwa-icon-192.png",
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
  openGraph: {
    title: "TRUECOLOURS - Automotive & Industrial Paints",
    description:
      "Paint matching, automotive refinish systems, 2K products, primers, hardeners, thinners, fillers, abrasives and workshop supplies in Mankweng, Limpopo.",
    type: "website",
    locale: "en_ZA",
    siteName: "TRUECOLOURS",
    url: siteConfig.siteUrl,
  },
};

const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": ["Organization", "LocalBusiness"],
  name: siteConfig.name,
  legalName: siteConfig.legalName,
  url: siteConfig.siteUrl,
  logo: `${siteConfig.siteUrl}${siteConfig.images.logo}`,
  foundingDate: siteConfig.registrationDate,
  identifier: { "@type": "PropertyValue", propertyID: "CIPC registration number", value: siteConfig.registrationNumber },
  description: `${siteConfig.legalName} is a registered South African ${siteConfig.enterpriseType.toLowerCase()} supplying automotive and industrial paints.`,
  address: { "@type": "PostalAddress", streetAddress: siteConfig.registeredOffice.street, addressLocality: siteConfig.registeredOffice.city, addressRegion: siteConfig.registeredOffice.province, postalCode: siteConfig.registeredOffice.postalCode, addressCountry: siteConfig.registeredOffice.country },
  telephone: `+27${siteConfig.phonePrimaryRaw.slice(1)}`,
  sameAs: Object.values(siteConfig.social),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-ZA" className={`${inter.variable} ${barlowCondensed.variable} ${publicSans.variable} ${publicMono.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationStructuredData).replace(/</g, "\\u003c") }} />
        <noscript><style>{`.public-site [style*="opacity:0"], .public-site [style*="opacity: 0"] { opacity: 1 !important; transform: none !important; }`}</style></noscript>
        <MotionProvider><QueryProvider><AuthProvider>{children}</AuthProvider></QueryProvider></MotionProvider>
      </body>
    </html>
  );
}
