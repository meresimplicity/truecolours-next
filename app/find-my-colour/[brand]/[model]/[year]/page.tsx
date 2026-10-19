import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { PaintFinderCatalogue } from "@/components/paint/PaintFinderCatalogue";
import { getPaintProvider } from "@/lib/paint/provider";

interface PageProps {
  params: Promise<{ brand: string; model: string; year: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brand, model, year } = await params;
  const provider = getPaintProvider();
  const brands = await provider.getBrands();
  const brandMatch = brands.find((b) => b.slug === brand.toLowerCase() || b.name.toLowerCase() === brand.toLowerCase());

  const brandName = brandMatch ? brandMatch.name : brand.toUpperCase();
  const models = brandMatch ? await provider.getModels(brandMatch.name) : [];
  const modelMatch = models.find((m) => m.slug === model.toLowerCase() || m.name.toLowerCase() === model.toLowerCase());
  const modelName = modelMatch ? modelMatch.name : model.toUpperCase();

  return {
    title: `${brandName} ${modelName} Paint Codes ${year} | TRUECOLOURS`,
    description: `Official ${year} factory OEM paint codes, sales codes, alternative names, and digital swatches for ${brandName} ${modelName}. Physical formulation verification by TRUECOLOURS.`,
    openGraph: {
      title: `${brandName} ${modelName} Paint Codes ${year} | TRUECOLOURS`,
      description: `Factory OEM colours for ${brandName} ${modelName} (${year}).`,
      locale: "en_ZA",
    },
  };
}

export default async function YearPaintPage({ params }: PageProps) {
  const { brand, model, year } = await params;
  const provider = getPaintProvider();
  const brands = await provider.getBrands();
  const brandMatch = brands.find((b) => b.slug === brand.toLowerCase() || b.name.toLowerCase() === brand.toLowerCase());

  if (!brandMatch) {
    notFound();
  }

  const models = await provider.getModels(brandMatch.name);
  const modelMatch = models.find((m) => m.slug === model.toLowerCase() || m.name.toLowerCase() === model.toLowerCase());

  if (!modelMatch) {
    notFound();
  }

  return (
    <div className="public-site min-h-screen flex flex-col justify-between">
      <Navbar />
      <main className="tc-paint-page flex-1">
        <PaintFinderCatalogue
          initialBrand={brandMatch.name}
          initialModel={modelMatch.name}
          initialYear={year}
        />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
