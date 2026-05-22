import { Link } from '@tanstack/react-router';
import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip } from 'chart.js';
import { useMemo } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import Spinner from '../components/atoms/Spinner';
import StatCard from '../components/molecules/StatCard';
import TransactionTable from '../components/templates/TransactionTable';
import { useAppContext } from '../context/AppContext';
import { formatCurrency } from '../utils/formatters';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export default function Dashboard() {
  const { transactions, categories, loading, openTransactionModal, handleDeleteTransaction } = useAppContext();

  // Compute Stats
  const stats = useMemo(() => {
    const inc = transactions.filter((t) => t.type === 'pemasukan').reduce((a, t) => a + Number(t.amount), 0);
    const exp = transactions.filter((t) => t.type === 'pengeluaran').reduce((a, t) => a + Number(t.amount), 0);
    return {
      income: inc,
      expense: exp,
      balance: inc - exp,
      txCount: transactions.length,
    };
  }, [transactions]);

  // Group Balance by Category
  const balanceByCategory = useMemo(() => {
    const groups: Record<string, number> = {};
    transactions.forEach((t) => {
      if (!groups[t.category]) groups[t.category] = 0;
      if (t.type === 'pemasukan') {
        groups[t.category] += Number(t.amount);
      } else {
        groups[t.category] -= Number(t.amount);
      }
    });
    return Object.entries(groups).sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  // Group Expenses by Category for Doughnut Chart
  const expenseByCategory = useMemo(() => {
    const groups: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'pengeluaran')
      .forEach((t) => {
        groups[t.category] = (groups[t.category] || 0) + Number(t.amount);
      });
    return Object.entries(groups).sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  // Group Monthly Cashflow Data for Bar Chart
  const monthlyCashflow = useMemo(() => {
    const monthlyData: Record<string, { label: string; income: number; expense: number }> = {};
    const chronologicalTx = [...transactions].reverse();

    chronologicalTx.forEach((t) => {
      const date = new Date(t.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[key]) {
        monthlyData[key] = {
          label: date.toLocaleDateString('id-ID', {
            month: 'short',
            year: 'numeric',
          }),
          income: 0,
          expense: 0,
        };
      }

      if (t.type === 'pemasukan') {
        monthlyData[key].income += Number(t.amount);
      } else {
        monthlyData[key].expense += Number(t.amount);
      }
    });

    const sortedKeys = Object.keys(monthlyData).sort().slice(-6);
    return {
      labels: sortedKeys.map((k) => monthlyData[k].label),
      income: sortedKeys.map((k) => monthlyData[k].income),
      expense: sortedKeys.map((k) => monthlyData[k].expense),
    };
  }, [transactions]);

  const getCategoryEmoji = (type: string, catName: string): string => {
    const found = categories.find((c) => c.name === catName && c.type === type);
    return found ? found.emoji || '📦' : '📦';
  };

  const recentTx = useMemo(() => transactions.slice(0, 5), [transactions]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div>
        <h2 className="text-[18px] font-bold text-textMain mb-4">Ringkasan Keuangan</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Pemasukan" value={stats.income} variant="income" />
          <StatCard title="Pengeluaran" value={stats.expense} variant="expense" />
          <StatCard title="Sisa Saldo" value={stats.balance} variant="accent" isPrefixDynamic={true} />
          <StatCard title="Total Transaksi" value={stats.txCount} variant="blue" formatter={(val) => val.toString()} />
        </div>
      </div>

      {/* Charts Visualization Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cashflow Trends (Large Column) */}
        <div className="bg-surface rounded-xl border border-border p-5 shadow-sm md:col-span-2">
          <h3 className="font-bold text-[14px] text-textMain uppercase tracking-[0.6px] mb-4">Tren Arus Kas Bulanan</h3>
          <div className="h-[240px]">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <Spinner size="lg" />
              </div>
            ) : (
              <Bar
                data={{
                  labels: monthlyCashflow.labels.length ? monthlyCashflow.labels : ['Belum ada data'],
                  datasets: [
                    {
                      label: '📈 Pemasukan',
                      data: monthlyCashflow.income.length ? monthlyCashflow.income : [0],
                      backgroundColor: '#1a6b4a',
                      borderRadius: 6,
                    },
                    {
                      label: '📉 Pengeluaran',
                      data: monthlyCashflow.expense.length ? monthlyCashflow.expense : [0],
                      backgroundColor: '#b93030',
                      borderRadius: 6,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                      labels: { font: { size: 11 } },
                    },
                  },
                }}
              />
            )}
          </div>
        </div>

        {/* Category Breakdown (Small Column) */}
        <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
          <h3 className="font-bold text-[14px] text-textMain uppercase tracking-[0.6px] mb-4">Pengeluaran</h3>
          <div className="h-[240px] flex items-center justify-center">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <Spinner size="lg" />
              </div>
            ) : (
              <Doughnut
                data={{
                  labels: expenseByCategory.map(([name]) => name).length
                    ? expenseByCategory.map(([name]) => name)
                    : ['Tidak Ada Pengeluaran'],
                  datasets: [
                    {
                      data: expenseByCategory.map(([, val]) => val).length
                        ? expenseByCategory.map(([, val]) => val)
                        : [1],
                      backgroundColor: [
                        '#3b82f6',
                        '#10b981',
                        '#f59e0b',
                        '#8b5cf6',
                        '#ef4444',
                        '#ec4899',
                        '#14b8a6',
                        '#f43f5e',
                        '#64748b',
                      ].slice(0, Math.max(1, expenseByCategory.length)),
                      borderWidth: 1,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { boxWidth: 10, font: { size: 10 } },
                    },
                  },
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Balance By Category Section */}
      <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
        <h3 className="font-bold text-[14px] text-textMain uppercase tracking-[0.6px] mb-4">Sisa Saldo per Kategori</h3>
        {loading ? (
          <div className="flex items-center justify-center p-6">
            <Spinner size="lg" />
          </div>
        ) : balanceByCategory.length === 0 ? (
          <div className="p-6 text-center text-text3 text-[13px]">Belum ada data saldo kategori.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {balanceByCategory.map(([catName, balance]) => {
              const emoji = getCategoryEmoji('pemasukan', catName);
              return (
                <div
                  key={catName}
                  className="p-3 border border-border rounded-lg bg-surface2 flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[16px]">{emoji}</span>
                    <span
                      className="font-semibold text-[13px] text-textMain truncate max-w-[80px] md:max-w-[100px]"
                      title={catName}
                    >
                      {catName}
                    </span>
                  </div>
                  <span
                    className={`font-bold text-[13px] font-[tnum] ${
                      Number(balance) >= 0 ? 'text-income' : 'text-expense'
                    }`}
                  >
                    {formatCurrency(balance)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Transactions Section */}
      <div className="relative">
        <div className="absolute top-5 right-5 z-10">
          <Link
            to="/transactions"
            className="text-[12px] font-semibold text-textMain hover:underline bg-surface px-2 py-1 rounded"
          >
            Lihat Semua →
          </Link>
        </div>
        <TransactionTable
          title="Transaksi Terbaru"
          transactions={recentTx}
          loading={loading}
          onEdit={openTransactionModal}
          onDelete={handleDeleteTransaction}
          getCategoryEmoji={getCategoryEmoji}
          pagination={false}
        />
      </div>
    </div>
  );
}
