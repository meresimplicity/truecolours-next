"use client";

import { useState } from "react";

export function DirectCodeSearch({ onSearch }: { onSearch: (query: string) => void }) {
  const [value, setValue] = useState("");

  return (
    <form
      className="flex flex-col sm:flex-row gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSearch(value.trim());
      }}
    >
      <div className="flex-1">
        <label htmlFor="code-search" className="block text-sm text-steel mb-1">
          Already know your paint code?
        </label>
        <input
          id="code-search"
          type="text"
          placeholder="e.g. LY9T, NH-731P, 040"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full border border-line rounded-card px-3 py-2 font-code bg-white"
        />
      </div>
      <button
        type="submit"
        className="self-end px-4 py-2 rounded-card border border-ink text-ink font-display text-sm hover:bg-ink hover:text-white transition-colors"
      >
        Search
      </button>
    </form>
  );
}
