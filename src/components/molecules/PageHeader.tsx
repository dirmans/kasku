import type React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export default function PageHeader({ title, subtitle, actions, className = '' }: PageHeaderProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2 ${className}`}>
      <div>
        <h2 className="text-[20px] font-semibold text-textMain">{title}</h2>
        {subtitle && <p className="text-[12px] text-text3 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">{actions}</div>}
    </div>
  );
}
