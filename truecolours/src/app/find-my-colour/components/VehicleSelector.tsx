"use client";

interface Option {
  slug: string;
  label: string;
}

interface VehicleSelectorProps {
  makes: Option[];
  models: Option[];
  years: number[];
  selectedMake: string | null;
  selectedModel: string | null;
  selectedYear: number | null;
  yearsNote?: string;
  loadingModels: boolean;
  loadingYears: boolean;
  onMakeChange: (slug: string | null) => void;
  onModelChange: (slug: string | null) => void;
  onYearChange: (year: number | null) => void;
  onSubmit: () => void;
  submitDisabled: boolean;
}

export function VehicleSelector({
  makes,
  models,
  years,
  selectedMake,
  selectedModel,
  selectedYear,
  yearsNote,
  loadingModels,
  loadingYears,
  onMakeChange,
  onModelChange,
  onYearChange,
  onSubmit,
  submitDisabled,
}: VehicleSelectorProps) {
  return (
    <form
      className="border border-line rounded-card bg-white"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <Field
        label="Manufacturer"
        htmlFor="make"
        filled={Boolean(selectedMake)}
      >
        <select
          id="make"
          className="field-select"
          value={selectedMake ?? ""}
          onChange={(e) => onMakeChange(e.target.value || null)}
        >
          <option value="">Select manufacturer…</option>
          {makes.map((m) => (
            <option key={m.slug} value={m.slug}>
              {m.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Model"
        htmlFor="model"
        filled={Boolean(selectedModel)}
        disabled={!selectedMake}
      >
        <select
          id="model"
          className="field-select"
          value={selectedModel ?? ""}
          disabled={!selectedMake || loadingModels}
          onChange={(e) => onModelChange(e.target.value || null)}
        >
          <option value="">{loadingModels ? "Loading models…" : "Select model…"}</option>
          {models.map((m) => (
            <option key={m.slug} value={m.slug}>
              {m.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Year"
        htmlFor="year"
        filled={Boolean(selectedYear)}
        disabled={!selectedModel}
        last
        hint={yearsNote}
      >
        <select
          id="year"
          className="field-select"
          value={selectedYear ?? ""}
          disabled={!selectedModel || loadingYears}
          onChange={(e) => onYearChange(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">{loadingYears ? "Loading years…" : "Select year…"}</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </Field>

      <div className="p-4">
        <button
          type="submit"
          disabled={submitDisabled}
          className="w-full py-3 rounded-card bg-signal text-white font-display text-sm tracking-tight disabled:bg-steel-light disabled:cursor-not-allowed hover:bg-signal-dark transition-colors"
        >
          Find colour
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
  filled,
  disabled,
  last,
  hint,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  filled?: boolean;
  disabled?: boolean;
  last?: boolean;
  hint?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 px-4 py-3 ${!last ? "border-b border-line" : ""} ${disabled ? "opacity-50" : ""}`}>
      <label htmlFor={htmlFor} className="flex items-baseline justify-between text-sm text-steel">
        <span>{label}</span>
        {filled && <span className="text-signal text-xs">✓ selected</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-steel-light mt-1">{hint}</p>}
    </div>
  );
}
