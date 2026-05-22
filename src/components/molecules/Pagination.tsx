interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const indexOfLastItem = currentPage * pageSize;
  const indexOfFirstItem = indexOfLastItem - pageSize;

  return (
    <div
      className={`flex flex-col md:flex-row items-center justify-between gap-4 border-t border-border pt-4 text-[12.5px] text-text2 ${className}`}
    >
      <div className="text-center md:text-left">
        Menampilkan <span className="font-semibold text-textMain">{indexOfFirstItem + 1}</span> sampai{' '}
        <span className="font-semibold text-textMain">{Math.min(indexOfLastItem, totalItems)}</span> dari{' '}
        <span className="font-semibold text-textMain">{totalItems}</span> data
      </div>
      <div className="flex flex-wrap justify-center items-center gap-1.5">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 border border-border rounded-lg bg-surface hover:bg-surface2 disabled:opacity-40 transition-colors flex items-center gap-1"
        >
          <span>◀️</span> <span className="hidden sm:inline">Sebelumnya</span>
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
          <button
            key={num}
            onClick={() => onPageChange(num)}
            className={`w-8 h-8 rounded-lg border font-medium transition-colors ${
              currentPage === num
                ? 'bg-textMain border-textMain text-white'
                : 'border-border bg-surface text-textMain hover:bg-surface2'
            }`}
          >
            {num}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 border border-border rounded-lg bg-surface hover:bg-surface2 disabled:opacity-40 transition-colors flex items-center gap-1"
        >
          <span className="hidden sm:inline">Selanjutnya</span> <span>▶️</span>
        </button>
      </div>
    </div>
  );
}
