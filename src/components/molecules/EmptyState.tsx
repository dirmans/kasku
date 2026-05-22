interface EmptyStateProps {
  icon?: string;
  title?: string;
  description: string;
  className?: string;
}

export default function EmptyState({ icon, title, description, className = '' }: EmptyStateProps) {
  return (
    <div className={`p-12 text-center text-text3 text-[13.5px] ${className}`}>
      {icon && <div className="text-4xl mb-3">{icon}</div>}
      {title && <h4 className="font-semibold text-textMain text-[15px] mb-1">{title}</h4>}
      <p>{description}</p>
    </div>
  );
}
