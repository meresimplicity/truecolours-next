"use client";

import { useState } from "react";

export interface ConflictRow {
  id: string;
  field_name: string;
  source_a_value: string;
  source_b_value: string;
  source_a_name: string;
  source_b_name: string;
  record_label: string;
  status: string;
}

export function ConflictsTable({ conflicts }: { conflicts: ConflictRow[] }) {
  const [resolved, setResolved] = useState<Set<string>>(new Set());

  async function resolve(id: string, keep: "a" | "b") {
    const res = await fetch(`/api/admin/conflicts/${id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keep }),
    });
    if (res.ok) setResolved((prev) => new Set(prev).add(id));
  }

  const visible = conflicts.filter((c) => !resolved.has(c.id));

  return (
    <div>
      <h2 className="font-display text-lg mb-2">Open conflicts</h2>
      {visible.length === 0 ? (
        <p className="text-steel text-sm">No open conflicts.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((c) => (
            <div key={c.id} className="border border-rust bg-rust-light rounded-card p-3 text-sm">
              <p className="font-display mb-1">
                {c.record_label} · field <span className="font-code">{c.field_name}</span>
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => resolve(c.id, "a")}
                  className="flex-1 text-left border border-line bg-white rounded-card px-3 py-2 hover:border-signal"
                >
                  <span className="text-steel text-xs block">{c.source_a_name}</span>
                  {c.source_a_value}
                </button>
                <button
                  onClick={() => resolve(c.id, "b")}
                  className="flex-1 text-left border border-line bg-white rounded-card px-3 py-2 hover:border-signal"
                >
                  <span className="text-steel text-xs block">{c.source_b_name}</span>
                  {c.source_b_value}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
