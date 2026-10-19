"use client";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
}

export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  pageSize = 24,
  onPageSizeChange,
}: PaginationControlsProps) {
  if (totalPages <= 1 && (!onPageSizeChange || pageSize === 24)) return null;

  // Build page number sequence
  const pages: number[] = [];
  const maxButtons = 5;
  let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  const end = Math.min(totalPages, start + maxButtons - 1);
  if (end - start + 1 < maxButtons) {
    start = Math.max(1, end - maxButtons + 1);
  }

  for (let p = start; p <= end; p++) {
    pages.push(p);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 pb-2">
      {/* Page Size Selector (Optional 24, 48, 96) */}
      {onPageSizeChange && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Show per page:</span>
          {[24, 48, 96].map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => onPageSizeChange(size)}
              className={`rounded px-2 py-1 font-semibold transition cursor-pointer ${
                pageSize === size
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      )}

      {/* Pagination Buttons « 1 2 3 » */}
      <nav aria-label="Pagination" className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {/* Previous Button « */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-30 cursor-pointer"
        >
          «
        </button>

        {start > 1 && (
          <>
            <button
              type="button"
              onClick={() => onPageChange(1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              1
            </button>
            {start > 2 && <span className="px-1 text-slate-400">...</span>}
          </>
        )}

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            aria-current={p === currentPage ? "page" : undefined}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold transition cursor-pointer ${
              p === currentPage
                ? "bg-[#2970b6] text-white shadow-sm"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {p}
          </button>
        ))}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-1 text-slate-400">...</span>}
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              {totalPages}
            </button>
          </>
        )}

        {/* Next Button » */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-30 cursor-pointer"
        >
          »
        </button>
      </nav>
    </div>
  );
}
