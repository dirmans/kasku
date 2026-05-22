import type React from 'react';

export type BadgeVariant = 'income' | 'expense' | 'neutral' | 'info';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  className?: string;
}

export default function Badge({ label, variant = 'neutral', icon, className = '' }: BadgeProps) {
  const variantStyles = {
    income: 'bg-incomeBg border-[#d0f5e1] text-income',
    expense: 'bg-expenseBg border-[#fbe3e3] text-expense',
    neutral: 'bg-surface2 border-border text-textMain',
    info: 'bg-blueCustom/10 border-blueCustom/20 text-blueCustom',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${variantStyles[variant]} ${className}`}
    >
      {icon && <span>{icon}</span>}
      <span>{label}</span>
    </span>
  );
}
