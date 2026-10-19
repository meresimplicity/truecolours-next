import { NextResponse } from "next/server";
import { getPaintProvider } from "@/lib/paint/provider";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const provider = getPaintProvider();
    const brands = await provider.getBrands();

    return NextResponse.json({
      success: true,
      data: brands,
      count: brands.length,
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("[API /api/paint/brands] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve vehicle brands." },
      { status: 500 }
    );
  }
}
