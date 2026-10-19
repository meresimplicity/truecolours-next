# TRUECOLOURS — Find My Colour (starter)

A standalone starter implementing the "Find My Colour" vehicle paint
selector: **Manufacturer → Model → Year → factory paint colours → paint
code → WhatsApp lead handoff.**

This is not a demo with fake data pretending to be a real catalogue. It's a
working architecture — schema, provider adapters, import scripts, API
routes, UI — that starts empty and grows only through real imports. Read
**"No fake data policy"** below before touching anything.

## What's actually verified vs. best-effort

While building this, three of the four external sources cited in the
original research spec were checked **live** against their real docs
(8 Sep 2026), and the code below reflects what was actually found, not what
the spec assumed:

| Source | Verified live? | What changed from the original assumption |
| --- | --- | --- |
| **VehiclesDB** | Yes — repo, README, SCHEMA.md fetched | It does **not** yet publish per-model year data or variants (both are "reserved, currently unpopulated"). `vehiclesdb.provider.ts` reflects this honestly: `getYears()` returns `[]` rather than guessing. |
| **Paint Calculators** | Yes — API docs page fetched | Their own docs are internally inconsistent about the API base path (`api.paintcalculators.com/v1/...` in the quick start vs. `/api/v1/...` in the endpoint reference). Flagged as a `PAINT_CALCULATORS_BASE_URL` env override, not silently resolved. Also: their `car-colors` response never echoes back a per-colour year even though `year` is an accepted query param — so this build does **not** stamp a fitment's year from the request, only from what the response actually confirms. |
| **MyCarColor** | Partially — landing page fetched, `/docs` is gated behind an invite-only login | The real API schema could not be confirmed. `mycarcolor.provider.ts` is a disabled-by-default stub that throws rather than guessing at field names. |
| **NHTSA vPIC** | Yes — endpoint list fetched | Confirmed real and stable; used only as a secondary US-market source for year *validation*, not as a primary vehicle taxonomy. |

If you're picking this project back up later: re-verify these before
assuming they still hold, especially MyCarColor's ToS once you have real
portal access.

## Architecture

Two data layers, joined only through `paint_fitments`, matching the
research spec:

```
                 VEHICLE SOURCES                    PAINT SOURCES
                       │                                  │
            ┌──────────┴──────────┐          ┌────────────┼─────────────┐
       VehiclesDB              vPIC*      Paint Calculators  MyCarColor†  TRUECOLOURS
      (make/model)      (year validation)   (paint colours)   (stub)      (verified)
                       │                                  │
                       └────────────────┬─────────────────┘
                                         ↓
                                PAINT FITMENT DB
                                         │
                                         ↓
                              FIND MY COLOUR UI → WhatsApp
```
\* secondary/validation only — see table above.
† disabled by default until licence terms are confirmed — see table above.

- **Layer A — vehicle taxonomy**: `manufacturers`, `vehicle_models`,
  `vehicle_variants`, `vehicle_model_years`. Populated from VehiclesDB.
- **Layer B — paint catalogue**: `paint_colors`, `paint_aliases`.
  Populated from paint providers, one source-scoped row per provider.
- **Join layer**: `paint_fitments` — the only thing that says a colour was
  offered on a vehicle. Never inferred from "same manufacturer" (see
  `scripts/import-paint-provider.ts`, which only creates a fitment when a
  provider's own record names the model).
- **Provenance everywhere**: every table carries `source_id` /
  `source_record_id`; every paint/fitment row carries a
  `verification_status` (`source_verified` / `team_verified` / `unverified`
  / `conflicting` / `deprecated`) — see `db/migrations/0001_init_vehicle_paint_schema.sql`.

Full schema, provider interfaces, and priority/conflict rules: see the
inline comments in `db/migrations/0001_init_vehicle_paint_schema.sql`,
`src/providers/types.ts`, and `src/lib/conflict.ts`.

## No fake data policy

Nothing in this repository seeds a real manufacturer, model, paint code, or
colour name as if it were verified catalogue data. The only places a
brand/model name appears are:

- **Provider adapters** (`src/providers/*.provider.ts`) — reference real,
  cited sources (see table above), fetched live where noted, or explicitly
  marked unverified where not.
- **Tests** (`tests/*.test.ts`) — use either an obviously fictitious
  fixture (`Testmark` / `Sample One`) or a source's *own published API
  documentation example* (Paint Calculators' Tesla example), cited as such.
  Neither is written to a database or displayed to a user.

The database starts empty. Every row that ever lands in it came from
`scripts/import-*.ts` calling a real provider — see "Getting data in"
below.

## Getting started

```bash
cp .env.example .env.local   # fill in DATABASE_URL at minimum
npm install
npm run migrate               # applies db/migrations/*.sql
npm run dev
```

Visit `/find-my-colour` (empty until you import data — see below) and
`/admin/vehicle-catalogue` (coverage dashboard + conflict review).

### Dropping this into an existing Next.js app

If you already have a TRUECOLOURS codebase (App Router, Tailwind, a
Postgres/Supabase database), don't run this standalone — instead:

1. Copy `db/migrations/0001_init_vehicle_paint_schema.sql` into your own
   migrations folder and run it.
2. Copy `src/types`, `src/providers`, `src/lib/{db,normalize,conflict,whatsapp}.ts`,
   `scripts/`, `src/app/api/**`, and `src/app/find-my-colour/**` /
   `src/app/admin/vehicle-catalogue/**` into your project.
3. Merge `tailwind.config.js`'s `theme.extend` into your own config instead
   of overwriting it; merge the font setup in `src/app/layout.tsx` into your
   real root layout, then delete this repo's copy.
4. Add the env vars from `.env.example` to your existing `.env`.

### Getting data in

```bash
npm run import:vehicles                          # VehiclesDB → manufacturers, vehicle_models
npm run import:paint -- --provider=paint_calculators   # needs PAINT_CALCULATORS_API_KEY
npm run normalize:paint                           # recompute code_normalized, split compound codes
npm run dedupe:paint                              # merge cross-source duplicates, log conflicts
npm run validate:fitments                         # integrity checks, safe to run on a schedule
```

Run `normalize:paint` → `dedupe:paint` → `validate:fitments` in that order
after any paint import. `import:vehicles` only needs to run when you want
to refresh the vehicle taxonomy (VehiclesDB ships monthly).

Adding TRUECOLOURS's own confirmed records: insert directly into
`paint_colors` / `paint_fitments` with `source_id` pointing at the
`truecolours_internal` row in `data_sources` and
`verification_status = 'team_verified'` — or build an admin form that does
the same (not included here; the read side —
`src/providers/truecolours-internal.provider.ts` and the coverage
dashboard — is).

## Environment variables

See `.env.example` for the full list and comments. Server-side only —
`PAINT_CALCULATORS_API_KEY` and `MYCARCOLOR_API_KEY` are never read in
client code (only inside `src/app/api/**` route handlers and `scripts/**`).

## Licensing & attribution

- **VehiclesDB**: CC-BY 4.0. Required attribution (verbatim, do not remove):
  > Vehicle data by VehiclesDB (CC-BY 4.0), built from official public
  > registers — see ATTRIBUTION.md for source notices.

  This string lives in `src/providers/vehiclesdb.provider.ts` as
  `VEHICLESDB_ATTRIBUTION` — render it somewhere on any page that displays
  VehiclesDB-derived data.
- **NHTSA vPIC**: US government / public domain, no attribution required,
  no API key.
- **Paint Calculators**: proprietary API, free tier documented as
  1,000 requests/month, 10/minute. Confirm current terms before scaling
  usage — pricing pages change.
- **MyCarColor**: unconfirmed — see table above. Do not enable
  (`MYCARCOLOR_ENABLED=true`) until someone with real portal access has
  read the actual ToS and confirmed storage/redistribution rights.

## What's deliberately not included

Kept out to keep this reviewable rather than because it doesn't matter:

- **Variant selector UI/API** (`vehicle_variants` table exists, but
  VehiclesDB's variant layer is unpopulated and no other source in scope
  supplies it yet — building a dropdown with nothing to put in it would be
  the same "fake completeness" problem this whole spec is about avoiding).
  Add `/api/vehicles/variants` following the exact pattern of
  `/api/vehicles/models` once a source provides real variant data.
- **Full admin CRUD** for manually editing/approving individual records —
  the coverage dashboard and conflict-resolution flow are there;
  merge/reject/edit-alias forms are not.
- **Scheduled jobs** (spec section 30's daily/weekly/monthly cadence) — the
  scripts exist and are idempotent; wiring them to a cron/queue is
  deployment-specific and left to you.
- **MyCarColor's real integration** — intentionally a stub, see above.

## Tests

```bash
npm test
```

Covers: code/name normalization (including the "LY9T / 0E" vs "LY9T-0E"
equivalence), priority-based conflict resolution, and each provider adapter
against either a fictitious fixture or a source's own documented example
response — see `tests/*.test.ts` headers for which.
