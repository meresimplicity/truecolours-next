import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { PaintFinderCatalogue } from "@/components/paint/PaintFinderCatalogue";
import { getPaintProvider } from "@/lib/paint/provider";

interface PageProps {
  params: Promise<{ brand: string; model: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brand, model } = await params;
  const provider = getPaintProvider();
  const brands = await provider.getBrands();
  const brandMatch = brands.find((b) => b.slug === brand.toLowerCase() || b.name.toLowerCase() === brand.toLowerCase());

  const brandName = brandMatch ? brandMatch.name : brand.toUpperCase();
  const models = brandMatch ? await provider.getModels(brandMatch.name) : [];
  const modelMatch = models.find((m) => m.slug === model.toLowerCase() || m.name.toLowerCase() === model.toLowerCase());
  const modelName = modelMatch ? modelMatch.name : model.toUpperCase();

  return {
    title: `${brandName} ${modelName} Paint Codes | TRUECOLOURS`,
    description: `Complete factory OEM paint codes, alternative names, and digital swatches for ${brandName} ${modelName}. Professional vehicle paint matching in Limpopo.`,
    openGraph: {
      title: `${brandName} ${modelName} Paint Codes | TRUECOLOURS`,
      description: `Browse all factory OEM colours and paint codes for ${brandName} ${modelName}.`,
      locale: "en_ZA",
    },
  };
}

export default async function ModelPaintPage({ params }: PageProps) {
  const { brand, model } = await params;
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
        <PaintFinderCatalogue initialBrand={brandMatch.name} initialModel={modelMatch.name} />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
