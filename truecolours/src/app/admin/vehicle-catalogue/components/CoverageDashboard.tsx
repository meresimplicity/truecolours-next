export interface TotalsRow {
  manufacturers: number;
  models: number;
  modelYears: number;
  paintCodes: number;
  fitments: number;
  teamVerified: number;
  sourceVerified: number;
  conflictsOpen: number;
  missingPaint: number;
}

export interface ManufacturerCoverage {
  name: string;
  models: number;
  model_years: number;
  paint_codes: number;
  coverage_pct: number;
}

export function CoverageDashboard({
  totals,
  byManufacturer,
}: {
  totals: TotalsRow;
  byManufacturer: ManufacturerCoverage[];
}) {
  return (
    <section className="flex flex-col gap-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Manufacturers" value={totals.manufacturers} />
        <Stat label="Models" value={totals.models} />
        <Stat label="Model-years" value={totals.modelYears} />
        <Stat label="Paint codes" value={totals.paintCodes} />
        <Stat label="Fitments" value={totals.fitments} />
        <Stat label="TRUECOLOURS verified" value={totals.teamVerified} accent="signal" />
        <Stat label="Source verified" value={totals.sourceVerified} />
        <Stat label="Open conflicts" value={totals.conflictsOpen} accent={totals.conflictsOpen > 0 ? "rust" : undefined} />
      </div>

      <div>
        <h2 className="font-display text-lg mb-2">By manufacturer</h2>
        <div className="border border-line rounded-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-paper text-steel text-left">
              <tr>
                <th className="px-3 py-2 font-normal">Manufacturer</th>
                <th className="px-3 py-2 font-normal">Models</th>
                <th className="px-3 py-2 font-normal">Model-years</th>
                <th className="px-3 py-2 font-normal">Paint codes</th>
                <th className="px-3 py-2 font-normal">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {byManufacturer.map((row) => (
                <tr key={row.name} className="border-t border-line">
                  <td className="px-3 py-2 font-display">{row.name}</td>
                  <td className="px-3 py-2">{row.models}</td>
                  <td className="px-3 py-2">{row.model_years}</td>
                  <td className="px-3 py-2">{row.paint_codes}</td>
                  <td className="px-3 py-2">{row.coverage_pct}%</td>
                </tr>
              ))}
              {byManufacturer.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-steel-light">
                    No manufacturers imported yet — run scripts/import-vehicles.ts.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "signal" | "rust" }) {
  const color = accent === "signal" ? "text-signal" : accent === "rust" ? "text-rust" : "text-ink";
  return (
    <div className="border border-line rounded-card p-3">
      <p className={`font-display text-2xl ${color}`}>{value.toLocaleString()}</p>
      <p className="text-xs text-steel">{label}</p>
    </div>
  );
}
