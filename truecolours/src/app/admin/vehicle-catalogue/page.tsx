import { query, queryOne } from "@/lib/db";
import { CoverageDashboard, type ManufacturerCoverage, type TotalsRow } from "./components/CoverageDashboard";
import { ConflictsTable, type ConflictRow } from "./components/ConflictsTable";

export const dynamic = "force-dynamic"; // admin data changes constantly; never cache this page

async function getTotals(): Promise<TotalsRow> {
  const row = await queryOne<{
    manufacturers: string;
    models: string;
    model_years: string;
    paint_codes: string;
    fitments: string;
    team_verified: string;
    source_verified: string;
    conflicts_open: string;
    missing_paint: string;
  }>(
    `select
       (select count(*) from manufacturers) as manufacturers,
       (select count(*) from vehicle_models) as models,
       (select count(*) from vehicle_model_years) as model_years,
       (select count(*) from paint_colors) as paint_codes,
       (select count(*) from paint_fitments) as fitments,
       (select count(*) from paint_colors where verification_status = 'team_verified') as team_verified,
       (select count(*) from paint_colors where verification_status = 'source_verified') as source_verified,
       (select count(*) from data_conflicts where status = 'open') as conflicts_open,
       (select count(*) from vehicle_models vm
          where not exists (select 1 from paint_fitments pf where pf.model_id = vm.id)) as missing_paint
    `
  );
  return {
    manufacturers: Number(row?.manufacturers ?? 0),
    models: Number(row?.models ?? 0),
    modelYears: Number(row?.model_years ?? 0),
    paintCodes: Number(row?.paint_codes ?? 0),
    fitments: Number(row?.fitments ?? 0),
    teamVerified: Number(row?.team_verified ?? 0),
    sourceVerified: Number(row?.source_verified ?? 0),
    conflictsOpen: Number(row?.conflicts_open ?? 0),
    missingPaint: Number(row?.missing_paint ?? 0),
  };
}

async function getManufacturerCoverage(): Promise<ManufacturerCoverage[]> {
  return query<ManufacturerCoverage>(
    `select mf.name,
            count(distinct vm.id) as models,
            count(distinct vmy.id) as model_years,
            count(distinct pc.id) as paint_codes,
            case when count(distinct vm.id) = 0 then 0
                 else round(100.0 * count(distinct vm.id) filter (
                        where exists (select 1 from paint_fitments pf where pf.model_id = vm.id)
                      ) / count(distinct vm.id))
            end as coverage_pct
       from manufacturers mf
       left join vehicle_models vm on vm.manufacturer_id = mf.id
       left join vehicle_model_years vmy on vmy.model_id = vm.id
       left join paint_colors pc on pc.manufacturer_id = mf.id
      group by mf.id, mf.name
      order by mf.name asc`
  );
}

async function getOpenConflicts(): Promise<ConflictRow[]> {
  return query<ConflictRow>(
    `select dc.id, dc.field_name, dc.source_a_value, dc.source_b_value, dc.status,
            sa.name as source_a_name, sb.name as source_b_name,
            coalesce(pc.name, 'fitment #' || dc.paint_fitment_id) as record_label
       from data_conflicts dc
       join data_sources sa on sa.id = dc.source_a_id
       join data_sources sb on sb.id = dc.source_b_id
       left join paint_colors pc on pc.id = dc.paint_color_id
      where dc.status = 'open'
      order by dc.created_at desc
      limit 100`
  );
}

export default async function VehicleCataloguePage() {
  const [totals, byManufacturer, conflicts] = await Promise.all([
    getTotals(),
    getManufacturerCoverage(),
    getOpenConflicts(),
  ]);

  return (
    <main className="max-w-5xl mx-auto px-4 py-10 flex flex-col gap-10">
      <header>
        <h1 className="font-display text-3xl">Vehicle catalogue</h1>
        <p className="text-steel">Coverage is computed from the current database — never hard-coded.</p>
      </header>

      <CoverageDashboard totals={totals} byManufacturer={byManufacturer} />
      <ConflictsTable conflicts={conflicts} />
    </main>
  );
}
