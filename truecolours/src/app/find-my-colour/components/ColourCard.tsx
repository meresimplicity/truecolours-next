"use client";

import type { PaintResult } from "@/types/paint";

const STATUS_LABEL: Record<string, string> = {
  source_verified: "Source verified",
  team_verified: "TRUECOLOURS verified",
  unverified: "Unverified",
  conflicting: "Conflicting sources",
  deprecated: "Deprecated",
};

export function ColourCard({ color, onSelect }: { color: PaintResult; onSelect: (color: PaintResult) => void }) {
  const swatch = color.hex ?? "#C7C5BE"; // neutral placeholder — never a guessed colour value
  const statusLabel = STATUS_LABEL[color.verificationStatus] ?? "Unverified";
  const isVerified = color.verificationStatus === "source_verified" || color.verificationStatus === "team_verified";

  return (
    <article className="rounded-card border border-line bg-white overflow-hidden flex flex-col">
      <div
        className="h-28 w-full"
        style={{
          background: `linear-gradient(155deg, ${swatch} 0%, ${swatch} 55%, ${lighten(swatch, 0.18)} 100%)`,
        }}
        aria-hidden
      />
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-display text-base leading-snug">{color.name}</h3>

        <dl className="text-sm text-steel grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
          <dt>Code</dt>
          <dd className="font-code text-ink">{color.code}</dd>
          {color.auxCode && (
            <>
              <dt>Aux</dt>
              <dd className="font-code text-ink">{color.auxCode}</dd>
            </>
          )}
          {color.finish && (
            <>
              <dt>Finish</dt>
              <dd className="capitalize">{color.finish}</dd>
            </>
          )}
        </dl>

        <p className={`text-xs ${isVerified ? "text-signal" : "text-steel-light"}`}>{statusLabel}</p>

        <button
          onClick={() => onSelect(color)}
          className="mt-auto pt-2 text-sm font-display text-signal hover:text-signal-dark text-left"
        >
          Select this colour
        </button>
      </div>
    </article>
  );
}

/** Lightens a hex colour for the swatch sheen — presentation only, never used as data. */
function lighten(hex: string, amount: number): string {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return hex;
  const [, r, g, b] = match.map((v, i) => (i === 0 ? v : parseInt(v, 16)));
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r as number)}, ${mix(g as number)}, ${mix(b as number)})`;
}
