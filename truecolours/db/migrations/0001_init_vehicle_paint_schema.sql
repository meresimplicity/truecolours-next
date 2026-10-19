-- TRUECOLOURS — Find My Colour schema
--
-- Two separate layers, joined only through paint_fitments:
--   Layer A (vehicle taxonomy): manufacturers, vehicle_models,
--     vehicle_variants, vehicle_model_years
--   Layer B (paint catalogue): paint_colors, paint_aliases
--   Join layer: paint_fitments (many-to-many, with provenance)
--
-- Every externally-sourced row carries source_id + source_record_id so it
-- can be traced back to where it came from, and a verification_status so
-- "we scraped this" is never displayed as "we confirmed this".
--
-- Nothing in this file seeds real vehicle or paint data. Population
-- happens exclusively through scripts/import-*.ts against a configured
-- provider — see README "No fake data" section.

begin;

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ---------------------------------------------------------------------
-- Shared enums
-- ---------------------------------------------------------------------

create type verification_status as enum (
  'source_verified',   -- came from a provider we trust structurally, unmodified
  'team_verified',      -- a TRUECOLOURS human confirmed this against a real vehicle/label
  'unverified',          -- imported but not yet checked
  'conflicting',         -- two+ sources disagree, see data_conflicts
  'deprecated'            -- superseded / withdrawn
);

create type import_job_status as enum ('pending', 'running', 'succeeded', 'failed', 'partial');
create type import_job_type as enum ('vehicle_taxonomy', 'paint_catalogue', 'paint_fitment');
create type conflict_status as enum ('open', 'resolved', 'dismissed');

-- ---------------------------------------------------------------------
-- data_sources — registry of every provider TRUECOLOURS pulls from,
-- including its own internal "verified by us" pseudo-source. Every other
-- table's source_id points here, so licence/attribution text lives in
-- exactly one place.
-- ---------------------------------------------------------------------

create table data_sources (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,               -- 'vehiclesdb', 'paint_calculators', 'mycarcolor', 'truecolours_internal'
  name              text not null,
  kind              text not null check (kind in ('vehicle_taxonomy', 'paint_catalogue', 'internal')),
  base_url          text,
  license           text,                                 -- e.g. 'CC-BY-4.0', 'proprietary-api', 'internal'
  attribution_text  text,                                  -- required on-page credit, verbatim, if any
  requires_api_key  boolean not null default false,
  redistribution_allowed boolean not null default false,   -- false => must live-query, cannot persist/cache
  notes             text,
  created_at        timestamptz not null default now()
);

comment on table data_sources is
  'One row per external/internal data provider. license + redistribution_allowed gate whether import scripts are allowed to persist rows from that source at all.';

-- ---------------------------------------------------------------------
-- Layer A — vehicle taxonomy
-- ---------------------------------------------------------------------

create table manufacturers (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,          -- normalized display name, e.g. "Audi"
  slug             text not null unique,   -- "audi"
  country          text,
  source_id        uuid references data_sources(id),
  source_record_id text,                    -- the provider's own id for this row
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table vehicle_models (
  id               uuid primary key default gen_random_uuid(),
  manufacturer_id  uuid not null references manufacturers(id) on delete cascade,
  name             text not null,           -- "A4", "A1 Sportback" — kept distinct, never collapsed to a family name
  slug             text not null,
  vehicle_type     text,                     -- car | motorcycle | van | truck | bus | moped
  body_style       text,
  generation       text,
  year_from        int,
  year_to          int,
  source_id        uuid references data_sources(id),
  source_record_id text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (manufacturer_id, slug)
);

create table vehicle_variants (
  id               uuid primary key default gen_random_uuid(),
  model_id         uuid not null references vehicle_models(id) on delete cascade,
  name             text not null,           -- "Sportback", "Allroad", "Cabriolet"
  slug             text not null,
  body_style       text,
  trim             text,
  generation       text,
  year_from        int,
  year_to          int,
  source_id        uuid references data_sources(id),
  source_record_id text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (model_id, slug)
);

create table vehicle_model_years (
  id               uuid primary key default gen_random_uuid(),
  model_id         uuid not null references vehicle_models(id) on delete cascade,
  variant_id       uuid references vehicle_variants(id) on delete cascade,
  year             int not null,
  market           text,                     -- ISO country code or region, null = unspecified/global per source
  source_id        uuid references data_sources(id),
  source_record_id text,
  verified         boolean not null default false,
  created_at       timestamptz not null default now(),
  unique (model_id, variant_id, year, market)
);

create index idx_vehicle_models_manufacturer on vehicle_models(manufacturer_id);
create index idx_vehicle_variants_model on vehicle_variants(model_id);
create index idx_vehicle_model_years_model_year on vehicle_model_years(model_id, year);

-- ---------------------------------------------------------------------
-- Layer B — paint catalogue
-- ---------------------------------------------------------------------

create table paint_colors (
  id                   uuid primary key default gen_random_uuid(),
  manufacturer_id      uuid not null references manufacturers(id) on delete cascade,
  code                 text not null,          -- primary OEM paint code, e.g. "LY9T"
  code_normalized      text not null,          -- uppercase, whitespace/punctuation-stripped, for search/dedupe
  aux_code             text,                    -- e.g. "0E"
  standard_number      text,
  name                 text not null,          -- "Mythos Black Metallic"
  base_color           text,                    -- "BLACK" — coarse family, for filtering only
  finish               text,                    -- "metallic" | "pearl" | "solid" | "matte" | ...
  hex                  text,                    -- UI presentation only — never authoritative, see README
  source_id            uuid not null references data_sources(id),
  source_url           text,
  source_record_id     text,
  verification_status  verification_status not null default 'unverified',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (manufacturer_id, code_normalized, aux_code, source_id)
);

create table paint_aliases (
  id              uuid primary key default gen_random_uuid(),
  paint_color_id  uuid not null references paint_colors(id) on delete cascade,
  alias           text not null,
  language        text,                        -- e.g. 'en', 'de' — Color N Drive's Audi example ships EN + DE names
  source_id       uuid references data_sources(id),
  created_at      timestamptz not null default now(),
  unique (paint_color_id, alias, language)
);

create index idx_paint_colors_manufacturer on paint_colors(manufacturer_id);
create index idx_paint_colors_code_normalized on paint_colors(code_normalized);
create index idx_paint_aliases_alias on paint_aliases(lower(alias));

-- ---------------------------------------------------------------------
-- Join layer — paint_fitments
--
-- This is the table the whole architecture hinges on: it says "this paint
-- colour was offered on this model/variant/year/market", sourced and
-- confidence-scored independently of the paint_colors row itself. A paint
-- colour is never assumed to fit a vehicle just because both mention the
-- same manufacturer.
-- ---------------------------------------------------------------------

create table paint_fitments (
  id                   uuid primary key default gen_random_uuid(),
  paint_color_id       uuid not null references paint_colors(id) on delete cascade,
  manufacturer_id      uuid not null references manufacturers(id) on delete cascade,
  model_id             uuid references vehicle_models(id) on delete cascade,
  variant_id           uuid references vehicle_variants(id) on delete cascade,
  year_from            int,
  year_to              int,
  market               text,
  source_id            uuid not null references data_sources(id),
  source_url           text,
  source_record_id     text,
  confidence           numeric(3,2) not null default 1.00 check (confidence between 0 and 1),
  verification_status  verification_status not null default 'unverified',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index idx_paint_fitments_lookup on paint_fitments(manufacturer_id, model_id, year_from, year_to);
create index idx_paint_fitments_paint_color on paint_fitments(paint_color_id);
create index idx_paint_fitments_variant on paint_fitments(variant_id);

comment on column paint_fitments.confidence is
  'Computed by TRUECOLOURS, not copied from a provider: 1.00 for a single-source, structurally-clean match; lowered automatically when normalize/dedupe merges records that were not an exact match, or when a fitment is inferred rather than explicit. See src/lib/conflict.ts.';

-- ---------------------------------------------------------------------
-- import_jobs — every run of every importer, so "how fresh is this data"
-- and "what changed" are always answerable.
-- ---------------------------------------------------------------------

create table import_jobs (
  id                uuid primary key default gen_random_uuid(),
  source_id         uuid not null references data_sources(id),
  job_type          import_job_type not null,
  status            import_job_status not null default 'pending',
  started_at        timestamptz not null default now(),
  finished_at       timestamptz,
  records_seen      int not null default 0,
  records_inserted  int not null default 0,
  records_updated   int not null default 0,
  records_skipped   int not null default 0,
  triggered_by      text not null default 'schedule', -- 'schedule' | 'admin' | 'cli'
  error             text
);

-- ---------------------------------------------------------------------
-- data_conflicts — two sources disagreeing about the same paint_color or
-- paint_fitment. Never auto-resolved; always routed to admin review.
-- ---------------------------------------------------------------------

create table data_conflicts (
  id                uuid primary key default gen_random_uuid(),
  paint_color_id    uuid references paint_colors(id) on delete cascade,
  paint_fitment_id  uuid references paint_fitments(id) on delete cascade,
  field_name        text not null,          -- e.g. 'name', 'hex', 'year_to'
  source_a_id       uuid not null references data_sources(id),
  source_a_value    text not null,
  source_b_id       uuid not null references data_sources(id),
  source_b_value    text not null,
  status            conflict_status not null default 'open',
  resolution_note   text,
  created_at        timestamptz not null default now(),
  resolved_at       timestamptz,
  check (paint_color_id is not null or paint_fitment_id is not null)
);

create index idx_data_conflicts_status on data_conflicts(status);

commit;
