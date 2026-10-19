import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import WhatsAppButton from "@/components/WhatsAppButton";
import CatalogueClient from "./CatalogueClient";

export const metadata: Metadata = {
  title: "Catalogue | TRUECOLOURS",
  description:
    "Search TRUECOLOURS supplier ranges for automotive paint systems, fillers, thinners, masking, abrasives, polishing products, industrial coatings, tools and workshop supplies.",
  openGraph: {
    title: "TRUECOLOURS Catalogue",
    description:
      "Paint. Prep. Protect. Finish. Search supplier ranges available through TRUECOLOURS.",
    type: "website",
    locale: "en_ZA",
    siteName: "TRUECOLOURS",
  },
};

export default function CataloguePage() {
  return (
    <div className="public-site min-h-screen">
      <Navbar />
      <main><CatalogueClient /></main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
