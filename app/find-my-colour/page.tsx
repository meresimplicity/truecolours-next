import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { PaintFinderCatalogue } from "@/components/paint/PaintFinderCatalogue";

export const metadata: Metadata = {
  title: "Find My Colour — Automotive Paint Code Catalogue | TRUECOLOURS",
  description:
    "Search all vehicle paint colours by name, paint code, make or model with predictive suggestions, or browse antique and classic colour books. Paint matching in Mankweng, Limpopo.",
  openGraph: {
    title: "Find My Colour — Automotive Paint Code Catalogue | TRUECOLOURS",
    description:
      "Search factory paint colours by name, code, make or model, with predictive suggestions and optional vehicle selectors.",
    type: "website",
    locale: "en_ZA",
    siteName: "TRUECOLOURS",
  },
};

export default function FindMyColourPage() {
  return (
    <div className="public-site min-h-screen flex flex-col justify-between">
      <Navbar />
      <main className="tc-paint-page flex-1">
        <PaintFinderCatalogue />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
