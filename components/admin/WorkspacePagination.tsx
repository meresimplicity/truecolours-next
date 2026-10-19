"use client";
export function WorkspacePagination({
  page,
  hasMore,
  onChange,
}: {
  page: number;
  hasMore: boolean;
  onChange: (page: number) => void;
}) {
  return (
    <nav
      aria-label="Workspace pages"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
    >
      <p className="text-slate-500">Page {page} · up to 50 records</p>
      <div className="flex gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="rounded-lg border border-slate-300 px-3 py-2 font-bold disabled:opacity-30"
        >
          Previous
        </button>
        <button
          disabled={!hasMore}
          onClick={() => onChange(page + 1)}
          className="rounded-lg border border-slate-300 px-3 py-2 font-bold disabled:opacity-30"
        >
          Next
        </button>
      </div>
    </nav>
  );
}
