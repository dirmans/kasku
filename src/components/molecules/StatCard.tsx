import { formatCurrency } from '../../utils/formatters';

export type StatCardVariant = 'income' | 'expense' | 'accent' | 'blue' | 'default';

interface StatCardProps {
  title: string;
  value: number;
  variant?: StatCardVariant;
  formatter?: (val: number) => string;
  className?: string;
  isPrefixDynamic?: boolean; // If true, adds + for positive and - for negative
}

export default function StatCard({
  title,
  value,
  variant = 'default',
  formatter = formatCurrency,
  className = '',
  isPrefixDynamic = false,
}: StatCardProps) {
  const variantStyles = {
    income: 'border-t-[3px] border-t-income',
    expense: 'border-t-[3px] border-t-expense',
    accent: 'border-t-[3px] border-t-accent',
    blue: 'border-t-[3px] border-t-blueCustom',
    default: 'border-t-[3px] border-t-border',
  };

  const textStyles = {
    income: 'text-income',
    expense: 'text-expense',
    accent: value >= 0 ? 'text-income' : 'text-expense',
    blue: 'text-textMain',
    default: 'text-textMain',
  };

  const formattedValue = formatter(Math.abs(value));
  let displayValue = formattedValue;

  if (isPrefixDynamic) {
    if (value > 0) displayValue = `+ ${formattedValue}`;
    if (value < 0) displayValue = `- ${formattedValue}`;
  }

  return (
    <div
      className={`bg-surface rounded-xl border border-border p-4 shadow-sm relative overflow-hidden ${variantStyles[variant]} ${className}`}
    >
      <div className="text-[10px] text-text3 uppercase tracking-[0.6px] font-semibold mb-1">{title}</div>
      <div className={`text-[18px] font-bold font-[tnum] ${textStyles[variant]}`}>{displayValue}</div>
    </div>
  );
}
