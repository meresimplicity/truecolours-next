"use client";

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 2
  );

  return (
    <nav className="flex items-center justify-center gap-1 py-6 text-sm" aria-label="Pagination">
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="text-steel-light px-1">…</span>}
          <button
            onClick={() => onPageChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={`w-8 h-8 rounded-card font-display ${
              p === page ? "bg-signal text-white" : "text-steel hover:bg-line"
            }`}
          >
            {p}
          </button>
        </span>
      ))}
    </nav>
  );
}
