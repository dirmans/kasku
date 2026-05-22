interface ActionButtonsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export default function ActionButtons({ onEdit, onDelete, className = '' }: ActionButtonsProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {onEdit && (
        <button
          onClick={onEdit}
          className="p-1.5 rounded border border-border text-text3 hover:text-textMain hover:bg-surface2 transition-all"
          title="Edit"
        >
          ✏️
        </button>
      )}
      {onDelete && (
        <button
          onClick={onDelete}
          className="p-1.5 rounded border border-border text-text3 hover:text-expense hover:bg-expenseBg hover:border-[#f1c4c4] transition-all"
          title="Hapus"
        >
          🗑️
        </button>
      )}
    </div>
  );
}
