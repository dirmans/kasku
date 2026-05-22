import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip } from 'chart.js';
import { jsPDF } from 'jspdf';
import { useMemo, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { toast } from 'react-hot-toast';
import Spinner from '../components/atoms/Spinner';
import PageHeader from '../components/molecules/PageHeader';
import StatCard from '../components/molecules/StatCard';
import DataTable, { type Column } from '../components/organisms/DataTable';
import { useAppContext } from '../context/AppContext';
import { formatCurrency } from '../utils/formatters';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export default function ReportsPage() {
  const { transactions, loading } = useAppContext();
  const [period, setPeriod] = useState('all');

  const reportTransactions = useMemo(() => {
    if (period === 'all') return transactions;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfThreeMonths = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return transactions.filter((t) => {
      const txDate = new Date(t.date);
      if (period === 'month') {
        return txDate >= startOfMonth;
      }
      if (period === '3months') {
        return txDate >= startOfThreeMonths;
      }
      if (period === 'year') {
        return txDate >= startOfYear;
      }
      return true;
    });
  }, [transactions, period]);

  const stats = useMemo(() => {
    const inc = reportTransactions.filter((t) => t.type === 'pemasukan').reduce((a, t) => a + Number(t.amount), 0);
    const exp = reportTransactions.filter((t) => t.type === 'pengeluaran').reduce((a, t) => a + Number(t.amount), 0);
    const bal = inc - exp;
    const savingsRate = inc > 0 ? (bal / inc) * 100 : 0;

    return {
      income: inc,
      expense: exp,
      balance: bal,
      savingsRate: savingsRate > 0 ? savingsRate : 0,
    };
  }, [reportTransactions]);

  const expenseByCategory = useMemo(() => {
    const groups: Record<string, number> = {};
    reportTransactions
      .filter((t) => t.type === 'pengeluaran')
      .forEach((t) => {
        groups[t.category] = (groups[t.category] || 0) + Number(t.amount);
      });
    const total = Object.values(groups).reduce((a, b) => a + b, 0);
    return Object.entries(groups).map(([category, amount]) => ({
      category,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    }));
  }, [reportTransactions]);

  const balanceByCategory = useMemo(() => {
    const groups: Record<string, number> = {};
    reportTransactions.forEach((t) => {
      if (!groups[t.category]) groups[t.category] = 0;
      if (t.type === 'pemasukan') {
        groups[t.category] += Number(t.amount);
      } else {
        groups[t.category] -= Number(t.amount);
      }
    });
    return Object.entries(groups).map(([category, amount]) => ({
      category,
      amount,
    }));
  }, [reportTransactions]);

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

  const cashflowChartData = {
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
  };

  const cashflowChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { font: { size: 12, weight: 'bold' as const } },
      },
      tooltip: {
        callbacks: {
          label: (context: import('chart.js').TooltipItem<'bar'>) =>
            ` ${context.dataset.label}: ${formatCurrency(context.raw as number)}`,
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: (value: string | number) => formatCurrency(Number(value)),
        },
      },
    },
  };

  const doughnutChartData = {
    labels: expenseByCategory.map((d) => d.category).length
      ? expenseByCategory.map((d) => d.category)
      : ['Tidak Ada Pengeluaran'],
    datasets: [
      {
        data: expenseByCategory.map((d) => d.amount).length ? expenseByCategory.map((d) => d.amount) : [1],
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
  };

  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: { boxWidth: 12, font: { size: 11 } },
      },
      tooltip: {
        callbacks: {
          label: (context: import('chart.js').TooltipItem<'doughnut'>) => {
            const val = context.raw as number;
            if (expenseByCategory.length === 0) return ' 0%';
            const total = expenseByCategory.reduce((a, d) => a + d.amount, 0);
            const pct = ((val / total) * 100).toFixed(1);
            return ` ${context.label}: ${formatCurrency(val)} (${pct}%)`;
          },
        },
      },
    },
  };

  const handleDownloadPDF = async () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const periodText: Record<string, string> = {
        all: 'Semua Waktu',
        month: 'Bulan Ini',
        '3months': '3 Bulan Terakhir',
        year: 'Tahun Ini',
      };

      const nowStr = new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

      const pageW = 210;
      const margin = 18;
      const contentW = 210 - margin * 2;

      // Header Banner
      doc.setFillColor(26, 25, 22);
      doc.rect(0, 0, pageW, 44, 'F');

      // Text Header
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('KasKu', margin, 16);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(160, 158, 150);
      doc.text('Bhineka Djaya Primasatya', margin, 22);
      doc.text('Laporan Keuangan', margin, 27);
      doc.text(`Periode: ${periodText[period] || 'Semua Waktu'}`, margin, 32);

      doc.text(`Dicetak: ${nowStr}`, pageW - margin, 22, { align: 'right' });
      doc.text(`${reportTransactions.length} transaksi`, pageW - margin, 27, {
        align: 'right',
      });

      // Stats Cards
      let y = 56;
      const bw = (contentW - 8) / 3;

      const formattedInc = formatCurrency(stats.income);
      const formattedExp = formatCurrency(stats.expense);
      const formattedBal = formatCurrency(Math.abs(stats.balance));

      const cards: Array<{
        label: string;
        value: string;
        color: [number, number, number];
        bg: [number, number, number];
      }> = [
        {
          label: 'Total Pemasukan',
          value: formattedInc,
          color: [26, 107, 74],
          bg: [232, 245, 238],
        },
        {
          label: 'Total Pengeluaran',
          value: formattedExp,
          color: [185, 48, 48],
          bg: [251, 234, 234],
        },
        {
          label: 'Saldo Bersih',
          value: formattedBal,
          color: stats.balance >= 0 ? [26, 107, 74] : [185, 48, 48],
          bg: stats.balance >= 0 ? [232, 245, 238] : [251, 234, 234],
        },
      ];

      cards.forEach((b, i) => {
        const x = margin + i * (bw + 4);
        doc.setFillColor(...b.bg);
        doc.roundedRect(x, y, bw, 22, 3, 3, 'F');
        doc.setFillColor(...b.color);
        doc.rect(x, y, bw, 2.5, 'F');

        doc.setTextColor(100, 100, 100);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(b.label, x + 4, y + 9);

        doc.setTextColor(...b.color);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(b.value, x + 4, y + 17);
      });

      y += 30;

      // Save PDF
      doc.save(
        `Laporan-KasKu-Bhineka_Djaya_Primasatya-${(periodText[period] || 'Semua_Waktu').replace(/ /g, '_')}.pdf`,
      );
      toast.success('📄 Laporan PDF berhasil diunduh!');
    } catch (error) {
      const err = error as Error;
      console.error('Error generating PDF report:', err);
      toast.error(`Gagal mengekspor PDF: ${err.message}`);
    }
  };

  const expenseColumns: Column<{ category: string; amount: number; percentage: number }>[] = [
    { key: 'category', label: 'Kategori', sortable: true },
    {
      key: 'amount',
      label: 'Total Pengeluaran',
      align: 'right',
      sortable: true,
      render: (r) => <span className="font-bold text-expense font-[tnum]">{formatCurrency(r.amount)}</span>,
    },
    {
      key: 'percentage',
      label: 'Persentase',
      align: 'right',
      sortable: true,
      render: (r) => {
        return <span className="font-[tnum] text-text2">{r.percentage.toFixed(1)}%</span>;
      },
    },
  ];

  const balanceColumns: Column<{ category: string; amount: number }>[] = [
    { key: 'category', label: 'Kategori', sortable: true },
    {
      key: 'amount',
      label: 'Sisa Saldo',
      align: 'right',
      sortable: true,
      render: (r) => (
        <span className={`font-bold font-[tnum] ${r.amount >= 0 ? 'text-income' : 'text-expense'}`}>
          {formatCurrency(r.amount)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analisis & Laporan"
        subtitle="Analisis pengeluaran, rasio tabungan, dan ekspor laporan"
        actions={
          <div className="flex gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="p-2 border border-border rounded-lg bg-surface text-textMain text-[13px] outline-none font-medium transition-colors focus:border-textMain"
            >
              <option value="all">📅 Semua Waktu</option>
              <option value="month">📅 Bulan Ini</option>
              <option value="3months">📅 3 Bulan Terakhir</option>
              <option value="year">📅 Tahun Ini</option>
            </select>
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-textMain text-white rounded-lg text-[13px] font-medium transition-colors hover:bg-[#333]"
            >
              📥 Unduh Laporan PDF
            </button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Pemasukan" value={stats.income} variant="income" />
        <StatCard title="Total Pengeluaran" value={stats.expense} variant="expense" />
        <StatCard title="Saldo Bersih" value={stats.balance} variant="accent" />
        <StatCard
          title="Rasio Tabungan (%)"
          value={stats.savingsRate}
          variant="blue"
          formatter={(val) => `${val.toFixed(1)}%`}
        />
      </div>

      {/* Charts Visualization Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface rounded-xl border border-border p-5 shadow-sm md:col-span-2">
          <h3 className="font-bold text-[14px] text-textMain uppercase tracking-[0.6px] mb-4">Tren Arus Kas Bulanan</h3>
          <div className="h-[280px]">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <Spinner size="lg" />
              </div>
            ) : (
              <Bar data={cashflowChartData} options={cashflowChartOptions} />
            )}
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
          <h3 className="font-bold text-[14px] text-textMain uppercase tracking-[0.6px] mb-4">
            Distribusi Pengeluaran
          </h3>
          <div className="h-[280px] flex items-center justify-center">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <Spinner size="lg" />
              </div>
            ) : (
              <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
            )}
          </div>
        </div>
      </div>

      <DataTable
        title="Rincian Pengeluaran Kategori"
        columns={expenseColumns}
        data={expenseByCategory}
        keyExtractor={(r) => r.category}
        loading={loading}
        defaultSortKey="amount"
        emptyMessage="Belum ada catatan pengeluaran pada periode ini."
        mobileCard={(r) => {
          const total = expenseByCategory.reduce((a, d) => a + d.amount, 0);
          const pct = ((r.amount / total) * 100).toFixed(1);
          return (
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-textMain text-[14px]">{r.category}</div>
                <div className="text-[11.5px] text-text3 mt-0.5">Persentase: {pct}%</div>
              </div>
              <div className="font-bold text-[14px] text-expense font-[tnum]">{formatCurrency(r.amount)}</div>
            </div>
          );
        }}
      />

      <DataTable
        title="Rincian Sisa Saldo Kategori"
        columns={balanceColumns}
        data={balanceByCategory}
        keyExtractor={(r) => r.category}
        loading={loading}
        defaultSortKey="amount"
        emptyMessage="Belum ada catatan saldo kategori pada periode ini."
        mobileCard={(r) => (
          <div className="flex items-center justify-between">
            <div className="font-semibold text-textMain text-[14px]">{r.category}</div>
            <div className={`font-bold text-[14px] font-[tnum] ${r.amount >= 0 ? 'text-income' : 'text-expense'}`}>
              {formatCurrency(r.amount)}
            </div>
          </div>
        )}
      />
    </div>
  );
}
