import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { PaintFinderCatalogue } from "@/components/paint/PaintFinderCatalogue";
import { getPaintProvider } from "@/lib/paint/provider";

interface PageProps {
  params: Promise<{ brand: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brand } = await params;
  const provider = getPaintProvider();
  const brands = await provider.getBrands();
  const match = brands.find((b) => b.slug === brand.toLowerCase() || b.name.toLowerCase() === brand.toLowerCase());

  const brandName = match ? match.name : brand.toUpperCase();

  return {
    title: `${brandName} Paint Codes & Factory Colours | TRUECOLOURS`,
    description: `Official OEM factory paint codes and color swatches for ${brandName} vehicles. Order custom touch-up and spray paint in Mankweng, Limpopo.`,
    openGraph: {
      title: `${brandName} Paint Codes | TRUECOLOURS`,
      description: `Browse ${brandName} automotive paint codes and factory colors.`,
      locale: "en_ZA",
    },
  };
}

export default async function BrandPaintPage({ params }: PageProps) {
  const { brand } = await params;
  const provider = getPaintProvider();
  const brands = await provider.getBrands();
  const match = brands.find((b) => b.slug === brand.toLowerCase() || b.name.toLowerCase() === brand.toLowerCase());

  if (!match) {
    notFound();
  }

  return (
    <div className="public-site min-h-screen flex flex-col justify-between">
      <Navbar />
      <main className="tc-paint-page flex-1">
        <PaintFinderCatalogue initialBrand={match.name} />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
