import { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function ReportsTab({ transactions, categories, loading }) {
  const [period, setPeriod] = useState('all');

  // Utility to format Indonesian currency
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  // Filter transactions based on active period
  const reportTransactions = useMemo(() => {
    if (period === 'all') return transactions;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfThreeMonths = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return transactions.filter(t => {
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

  // Calculate statistics
  const stats = useMemo(() => {
    const inc = reportTransactions.filter(t => t.type === 'pemasukan').reduce((a, t) => a + Number(t.amount), 0);
    const exp = reportTransactions.filter(t => t.type === 'pengeluaran').reduce((a, t) => a + Number(t.amount), 0);
    const bal = inc - exp;
    const savingsRate = inc > 0 ? (bal / inc) * 100 : 0;

    return {
      income: inc,
      expense: exp,
      balance: bal,
      savingsRate: savingsRate > 0 ? savingsRate : 0
    };
  }, [reportTransactions]);

  // Group Expenses by Category
  const expenseByCategory = useMemo(() => {
    const groups = {};
    reportTransactions.filter(t => t.type === 'pengeluaran').forEach(t => {
      groups[t.category] = (groups[t.category] || 0) + Number(t.amount);
    });
    return Object.entries(groups)
      .sort((a, b) => b[1] - a[1]);
  }, [reportTransactions]);

  // Group Balance by Category
  const balanceByCategory = useMemo(() => {
    const groups = {};
    reportTransactions.forEach(t => {
      if (!groups[t.category]) groups[t.category] = 0;
      if (t.type === 'pemasukan') {
        groups[t.category] += Number(t.amount);
      } else {
        groups[t.category] -= Number(t.amount);
      }
    });
    return Object.entries(groups).sort((a, b) => b[1] - a[1]);
  }, [reportTransactions]);

  // Group Monthly Cashflow Data for Chart (last 6 months with data)
  const monthlyCashflow = useMemo(() => {
    const monthlyData = {};
    
    // Sort transactions oldest to newest to plot correctly
    const chronologicalTx = [...transactions].reverse();

    chronologicalTx.forEach(t => {
      const date = new Date(t.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[key]) {
        monthlyData[key] = {
          label: date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
          income: 0,
          expense: 0
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
      labels: sortedKeys.map(k => monthlyData[k].label),
      income: sortedKeys.map(k => monthlyData[k].income),
      expense: sortedKeys.map(k => monthlyData[k].expense)
    };
  }, [transactions]);

  // ChartJS: Cashflow Trend Chart Config
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
      }
    ]
  };

  const cashflowChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { font: { size: 12, weight: 'medium' } }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return ` ${context.dataset.label}: ${formatCurrency(context.raw)}`;
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: (value) => formatCurrency(value)
        }
      }
    }
  };

  // ChartJS: Category Breakdown Doughnut Config
  const doughnutChartData = {
    labels: expenseByCategory.map(([name]) => name).length ? expenseByCategory.map(([name]) => name) : ['Tidak Ada Pengeluaran'],
    datasets: [
      {
        data: expenseByCategory.map(([, val]) => val).length ? expenseByCategory.map(([, val]) => val) : [1],
        backgroundColor: [
          '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', 
          '#ec4899', '#14b8a6', '#f43f5e', '#64748b'
        ].slice(0, Math.max(1, expenseByCategory.length)),
        borderWidth: 1,
      }
    ]
  };

  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: { boxWidth: 12, font: { size: 11 } }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const val = context.raw;
            if (expenseByCategory.length === 0) return ' 0%';
            const total = expenseByCategory.reduce((a, [, v]) => a + v, 0);
            const pct = ((val / total) * 100).toFixed(1);
            return ` ${context.label}: ${formatCurrency(val)} (${pct}%)`;
          }
        }
      }
    }
  };

  // PDF Generation function (recreating test.html exactly but using React state)
  const handleDownloadPDF = async () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const periodText = {
        all: 'Semua Waktu',
        month: 'Bulan Ini',
        '3months': '3 Bulan Terakhir',
        year: 'Tahun Ini'
      }[period];

      const nowStr = new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });

      const pageW = 210;
      const margin = 18;
      const contentW = 210 - (margin * 2);

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
      doc.text('Periode: ' + periodText, margin, 32);

      doc.text('Dicetak: ' + nowStr, pageW - margin, 22, { align: 'right' });
      doc.text(reportTransactions.length + ' transaksi', pageW - margin, 27, { align: 'right' });

      // Stats Cards
      let y = 56;
      const bw = (contentW - 8) / 3;

      const formattedInc = formatCurrency(stats.income);
      const formattedExp = formatCurrency(stats.expense);
      const formattedBal = formatCurrency(Math.abs(stats.balance));

      const cards = [
        { label: 'Total Pemasukan', value: formattedInc, color: [26, 107, 74], bg: [232, 245, 238] },
        { label: 'Total Pengeluaran', value: formattedExp, color: [185, 48, 48], bg: [251, 234, 234] },
        { label: 'Saldo Bersih', value: formattedBal, color: stats.balance >= 0 ? [26, 107, 74] : [185, 48, 48], bg: stats.balance >= 0 ? [232, 245, 238] : [251, 234, 234] }
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

      // Category Breakdown Bars (horizontal)
      if (expenseByCategory.length > 0) {
        doc.setTextColor(26, 25, 22);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Ringkasan Pengeluaran per Kategori', margin, y);
        y += 5;

        const maxVal = expenseByCategory[0][1];
        const barMaxW = contentW - 95; // Reduced from -60 to -95 to prevent progress bar overlapping the amount text on the right
        const barColors = [
          [26, 107, 74],
          [185, 48, 48],
          [36, 86, 164],
          [193, 123, 42],
          [107, 63, 160]
        ];

        expenseByCategory.slice(0, 6).forEach(([cat, val], i) => {
          const pct = val / maxVal;
          const bw2 = Math.max(4, pct * barMaxW);
          const clr = barColors[i % barColors.length];

          // Gray background bar
          doc.setFillColor(240, 239, 233);
          doc.roundedRect(margin + 48, y + 1.5, barMaxW, 5, 1, 1, 'F');
          
          // Colored active progress bar
          doc.setFillColor(...clr);
          doc.roundedRect(margin + 48, y + 1.5, bw2, 5, 1, 1, 'F');
          
          // Label
          doc.setTextColor(80, 80, 80);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.text(cat, margin + 2, y + 5.5);

          // Amount text
          doc.setTextColor(...clr);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.text(formatCurrency(val), pageW - margin, y + 5.5, { align: 'right' });
          y += 10;
        });
        y += 6;
      }

      // Sisa Saldo per Kategori
      if (balanceByCategory.length > 0) {
        if (y > 250) {
          doc.addPage();
          y = margin;
        }
        doc.setTextColor(26, 25, 22);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Rincian Sisa Saldo Kategori', margin, y);
        y += 6;

        balanceByCategory.forEach(([cat, bal]) => {
          if (y > 275) {
            doc.addPage();
            y = margin + 5;
          }
          doc.setTextColor(80, 80, 80);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.text(cat, margin + 4, y);

          if (bal >= 0) {
            doc.setTextColor(26, 107, 74);
          } else {
            doc.setTextColor(185, 48, 48);
          }
          doc.setFont('helvetica', 'bold');
          doc.text(formatCurrency(bal), pageW - margin - 4, y, { align: 'right' });
          
          doc.setDrawColor(240, 239, 233);
          doc.line(margin, y + 2, pageW - margin, y + 2);
          
          y += 8;
        });
        y += 4;
      }

      // Transactions Details List
      doc.setTextColor(26, 25, 22);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Detail Transaksi', margin, y);
      y += 4;

      const cols = [28, 62, 22, 22, 38];
      const headers = ['Tanggal', 'Keterangan', 'Kategori', 'Jenis', 'Jumlah'];

      // Header row
      doc.setFillColor(26, 25, 22);
      doc.rect(margin, y, contentW, 7, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      
      let cx = margin + 2;
      headers.forEach((h, i) => {
        doc.text(h, cx, y + 5);
        cx += cols[i];
      });
      y += 7;

      let rowColor = false;
      let txOnPage = 0;

      const formatShortDate = (dStr) => {
        try {
          return new Date(dStr).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch {
          return dStr;
        }
      };

      for (let i = 0; i < reportTransactions.length; i++) {
        const t = reportTransactions[i];

        // Page break logic (similar to test.html)
        if (txOnPage >= 28) {
          doc.addPage();
          doc.setFillColor(26, 25, 22);
          doc.rect(0, 0, pageW, 10, 'F');
          
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.text('KasKu - Bhineka Djaya Primasatya — Laporan Keuangan (lanjutan)', margin, 7);
          
          y = 18;
          doc.setFillColor(26, 25, 22);
          doc.rect(margin, y, contentW, 7, 'F');
          
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          
          cx = margin + 2;
          headers.forEach((h, j) => {
            doc.text(h, cx, y + 5);
            cx += cols[j];
          });
          y += 7;
          txOnPage = 0;
        }

        // Alternating row background color
        if (rowColor) {
          doc.setFillColor(245, 244, 239);
          doc.rect(margin, y, contentW, 7, 'F');
        }
        rowColor = !rowColor;

        doc.setTextColor(80, 80, 80);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');

        cx = margin + 2;
        
        // Date
        doc.text(formatShortDate(t.date), cx, y + 5);
        cx += cols[0];

        // Description
        const truncatedDesc = t.description.length > 28 ? t.description.substring(0, 28) + '...' : t.description;
        doc.text(truncatedDesc, cx, y + 5);
        cx += cols[1];

        // Category
        const truncatedCat = t.category.length > 10 ? t.category.substring(0, 10) + '..' : t.category;
        doc.text(truncatedCat, cx, y + 5);
        cx += cols[2];

        // Type
        if (t.type === 'pemasukan') {
          doc.setTextColor(26, 107, 74);
          doc.text('Masuk', cx, y + 5);
        } else {
          doc.setTextColor(185, 48, 48);
          doc.text('Keluar', cx, y + 5);
        }
        cx += cols[3];

        // Amount
        const sign = t.type === 'pemasukan' ? '+' : '-';
        doc.text(sign + formatCurrency(t.amount), cx + cols[4] - 4, y + 5, { align: 'right' });

        y += 7;
        txOnPage++;
      }

      // Footer signature info
      y += 6;
      doc.setDrawColor(220, 218, 210);
      doc.line(margin, y, pageW - margin, y);
      
      y += 5;
      doc.setTextColor(160, 158, 150);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('KasKu - Bhineka Djaya Primasatya — Dicetak pada ' + nowStr, margin, y);

      doc.text('Saldo: ' + formatCurrency(stats.balance), pageW - margin, y, { align: 'right' });

      // Save PDF
      doc.save(`Laporan-KasKu-Bhineka_Djaya_Primasatya-${periodText.replace(/ /g, '_')}.pdf`);
      alert('📄 Laporan PDF berhasil diunduh!');
    } catch (err) {
      console.error('Error generating PDF report:', err);
      alert('Gagal mengekspor PDF: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Period Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-semibold text-textMain">Analisis & Laporan</h2>
          <p className="text-[12px] text-text3 mt-0.5">Analisis pengeluaran, rasio tabungan, dan ekspor laporan</p>
        </div>
        
        <div className="flex gap-2">
          {/* Period Selector */}
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

          {/* Download PDF Button */}
          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2 bg-textMain text-white rounded-lg text-[13px] font-medium transition-colors hover:bg-[#333]"
          >
            📥 Unduh Laporan PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Income Card */}
        <div className="bg-surface rounded-xl border border-border p-4 shadow-sm relative overflow-hidden border-t-[3px] border-t-income">
          <div className="text-[10px] text-text3 uppercase tracking-[0.6px] font-semibold mb-1">Total Pemasukan</div>
          <div className="text-[18px] font-bold text-income font-[tnum]">{formatCurrency(stats.income)}</div>
        </div>

        {/* Expense Card */}
        <div className="bg-surface rounded-xl border border-border p-4 shadow-sm relative overflow-hidden border-t-[3px] border-t-expense">
          <div className="text-[10px] text-text3 uppercase tracking-[0.6px] font-semibold mb-1">Total Pengeluaran</div>
          <div className="text-[18px] font-bold text-expense font-[tnum]">{formatCurrency(stats.expense)}</div>
        </div>

        {/* Balance Card */}
        <div className="bg-surface rounded-xl border border-border p-4 shadow-sm relative overflow-hidden border-t-[3px] border-t-accent">
          <div className="text-[10px] text-text3 uppercase tracking-[0.6px] font-semibold mb-1">Saldo Bersih</div>
          <div className={`text-[18px] font-bold font-[tnum] ${stats.balance >= 0 ? 'text-income' : 'text-expense'}`}>
            {stats.balance < 0 ? '-' : ''} {formatCurrency(Math.abs(stats.balance))}
          </div>
        </div>

        {/* Savings Rate Card */}
        <div className="bg-surface rounded-xl border border-border p-4 shadow-sm relative overflow-hidden border-t-[3px] border-t-blueCustom">
          <div className="text-[10px] text-text3 uppercase tracking-[0.6px] font-semibold mb-1">Rasio Tabungan (%)</div>
          <div className="text-[18px] font-bold text-textMain font-[tnum]">{stats.savingsRate.toFixed(1)}%</div>
        </div>
      </div>

      {/* Charts Visualization Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cashflow Trends (Large Column) */}
        <div className="bg-surface rounded-xl border border-border p-5 shadow-sm md:col-span-2">
          <h3 className="font-bold text-[14px] text-textMain uppercase tracking-[0.6px] mb-4">Tren Arus Kas Bulanan</h3>
          <div className="h-[280px]">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-border border-t-textMain rounded-full animate-spin"></div>
              </div>
            ) : (
              <Bar data={cashflowChartData} options={cashflowChartOptions} />
            )}
          </div>
        </div>

        {/* Category Breakdown (Small Column) */}
        <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
          <h3 className="font-bold text-[14px] text-textMain uppercase tracking-[0.6px] mb-4">Distribusi Pengeluaran</h3>
          <div className="h-[280px] flex items-center justify-center">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-border border-t-textMain rounded-full animate-spin"></div>
              </div>
            ) : (
              <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
            )}
          </div>
        </div>
      </div>

      {/* Category Expense Table summary */}
      <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
        <h3 className="font-bold text-[14px] text-textMain uppercase tracking-[0.6px] mb-4">Rincian Pengeluaran Kategori</h3>
        
        {loading ? (
          <div className="flex items-center justify-center p-6">
            <div className="w-6 h-6 border-2 border-border border-t-textMain rounded-full animate-spin"></div>
          </div>
        ) : expenseByCategory.length === 0 ? (
          <div className="p-6 text-center text-text3 text-[13px]">
            Belum ada catatan pengeluaran pada periode ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] text-left hidden md:table">
              <thead>
                <tr className="text-text3 font-semibold uppercase tracking-[0.4px] text-[11px] border-b border-border">
                  <th className="pb-2">Kategori</th>
                  <th className="pb-2 text-right">Total Pengeluaran</th>
                  <th className="pb-2 text-right">Persentase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {expenseByCategory.map(([name, val]) => {
                  const total = expenseByCategory.reduce((a, [, v]) => a + v, 0);
                  const pct = ((val / total) * 100).toFixed(1);
                  return (
                    <tr key={name} className="hover:bg-surface2/30 transition-colors">
                      <td className="py-2.5 font-medium text-textMain">{name}</td>
                      <td className="py-2.5 text-right font-bold text-expense font-[tnum]">{formatCurrency(val)}</td>
                      <td className="py-2.5 text-right font-[tnum] text-text2">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile Cards for Expense */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {expenseByCategory.map(([name, val]) => {
                const total = expenseByCategory.reduce((a, [, v]) => a + v, 0);
                const pct = ((val / total) * 100).toFixed(1);
                return (
                  <div key={name} className="p-4 bg-surface2 border border-border rounded-xl shadow-sm flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-textMain text-[14px]">{name}</div>
                      <div className="text-[11.5px] text-text3 mt-0.5">Persentase: {pct}%</div>
                    </div>
                    <div className="font-bold text-[14px] text-expense font-[tnum]">{formatCurrency(val)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Balance By Category Table summary */}
      <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
        <h3 className="font-bold text-[14px] text-textMain uppercase tracking-[0.6px] mb-4">Rincian Sisa Saldo Kategori</h3>
        
        {loading ? (
          <div className="flex items-center justify-center p-6">
            <div className="w-6 h-6 border-2 border-border border-t-textMain rounded-full animate-spin"></div>
          </div>
        ) : balanceByCategory.length === 0 ? (
          <div className="p-6 text-center text-text3 text-[13px]">
            Belum ada catatan saldo kategori pada periode ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] text-left hidden md:table">
              <thead>
                <tr className="text-text3 font-semibold uppercase tracking-[0.4px] text-[11px] border-b border-border">
                  <th className="pb-2">Kategori</th>
                  <th className="pb-2 text-right">Sisa Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {balanceByCategory.map(([name, bal]) => {
                  return (
                    <tr key={name} className="hover:bg-surface2/30 transition-colors">
                      <td className="py-2.5 font-medium text-textMain">{name}</td>
                      <td className={`py-2.5 text-right font-bold font-[tnum] ${bal >= 0 ? 'text-income' : 'text-expense'}`}>
                        {formatCurrency(bal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile Cards for Balance */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {balanceByCategory.map(([name, bal]) => (
                <div key={name} className="p-4 bg-surface2 border border-border rounded-xl shadow-sm flex items-center justify-between">
                  <div className="font-semibold text-textMain text-[14px]">{name}</div>
                  <div className={`font-bold text-[14px] font-[tnum] ${bal >= 0 ? 'text-income' : 'text-expense'}`}>
                    {formatCurrency(bal)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
