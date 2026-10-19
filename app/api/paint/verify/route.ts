import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { cleanText, slugify, normalizePaintCode } from "@/scripts/normalize-paint-codes";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      brand,
      model,
      year,
      code,
      name,
      finish,
      swatchHex,
      formulaNotes,
      verifiedBy,
    } = body;

    if (!brand || !model || !code || !name) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: brand, model, code, and name." },
        { status: 400 }
      );
    }

    const dbPath = path.join(process.cwd(), "data", "paint.db");
    const db = new DatabaseSync(dbPath);

    const normCode = normalizePaintCode(code);
    const now = new Date().toISOString();
    const verifier = cleanText(verifiedBy) || "TRUECOLOURS Refinish Specialist (Mankweng)";

    // Insert into truecolours_verified_colors
    const verifiedId = `tc-verified-${slugify(brand)}-${slugify(model)}-${normCode}-${Date.now()}`;
    const insertVerified = db.prepare(`
      INSERT OR REPLACE INTO truecolours_verified_colors (
        id, brand, model, year, primary_code, sales_code, name, finish,
        verified_swatch_hex, formula_notes, verified_by, verified_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertVerified.run(
      verifiedId,
      brand,
      model,
      year ? parseInt(year, 10) : null,
      normCode,
      code,
      name,
      finish || "Solid",
      swatchHex || null,
      formulaNotes || "Verified in-store by spectrophotometer / spray-out match.",
      verifier,
      now
    );

    // Update paint_colors table
    const updateColor = db.prepare(`
      UPDATE paint_colors
      SET verified = 1, source_id = 'truecolours', swatch_verified = 1,
          verified_by = ?, verified_at = ?, notes = coalesce(notes || ' ', '') || ?
      WHERE brand_name = ? AND model_name = ? AND id LIKE ?
    `);

    updateColor.run(
      verifier,
      now,
      formulaNotes ? ` [Verified: ${formulaNotes}]` : " [TRUECOLOURS in-store verified]",
      brand,
      model,
      `%${normCode}%`
    );

    // Also update data/paint-records.json
    const recordsPath = path.join(process.cwd(), "data", "paint-records.json");
    if (fs.existsSync(recordsPath)) {
      const records = JSON.parse(fs.readFileSync(recordsPath, "utf-8"));
      for (const r of records) {
        if (
          r.brand.toLowerCase() === brand.toLowerCase() &&
          r.model.toLowerCase() === model.toLowerCase() &&
          (r.code.toUpperCase() === code.toUpperCase() || r.primaryCode?.toUpperCase() === normCode)
        ) {
          r.verified = true;
          r.source = "truecolours";
          r.swatchVerified = true;
          r.verifiedBy = verifier;
          r.verifiedAt = now;
          if (formulaNotes) r.notes = `${r.notes || ""} [Verified: ${formulaNotes}]`.trim();
        }
      }
      fs.writeFileSync(recordsPath, JSON.stringify(records, null, 2));
    }

    return NextResponse.json({
      success: true,
      message: `Successfully verified paint code ${code} for ${brand} ${model}.`,
      verifiedRecord: {
        id: verifiedId,
        brand,
        model,
        code,
        name,
        verifier,
        verifiedAt: now,
      },
    });
  } catch (error) {
    console.error("[API /api/paint/verify] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to record TRUECOLOURS verification." },
      { status: 500 }
    );
  }
}
