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

interface ExpenseCategoryRow {
  category: string;
  amount: number;
  percentage: number;
  methods: Record<string, number>;
}

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

  const expenseByCategory = useMemo<ExpenseCategoryRow[]>(() => {
    const groups: Record<string, { total: number; methods: Record<string, number> }> = {};
    reportTransactions
      .filter((t) => t.type === 'pengeluaran')
      .forEach((t) => {
        const cat = t.category;
        const method = t.method || 'Tunai';
        if (!groups[cat]) {
          groups[cat] = { total: 0, methods: {} };
        }
        groups[cat].total += Number(t.amount);
        groups[cat].methods[method] = (groups[cat].methods[method] || 0) + Number(t.amount);
      });
    const total = Object.values(groups).reduce((a, b) => a + b.total, 0);
    return Object.entries(groups).map(([category, data]) => ({
      category,
      amount: data.total,
      percentage: total > 0 ? (data.total / total) * 100 : 0,
      methods: data.methods,
    }));
  }, [reportTransactions]);

  const balanceByPaymentMethod = useMemo(() => {
    const groups: Record<string, { income: number; expense: number; balance: number }> = {};
    reportTransactions.forEach((t) => {
      const method = t.method || 'Tunai';
      if (!groups[method]) {
        groups[method] = { income: 0, expense: 0, balance: 0 };
      }
      if (t.type === 'pemasukan') {
        groups[method].income += Number(t.amount);
        groups[method].balance += Number(t.amount);
      } else {
        groups[method].expense += Number(t.amount);
        groups[method].balance -= Number(t.amount);
      }
    });
    return Object.entries(groups).map(([method, data]) => ({
      method,
      income: data.income,
      expense: data.expense,
      amount: data.balance,
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
            const idx = context.dataIndex;
            const item = expenseByCategory[idx];
            if (!item) return '';
            const total = expenseByCategory.reduce((a, d) => a + d.amount, 0);
            const pct = ((item.amount / total) * 100).toFixed(1);

            const lines = [` ${item.category}: ${formatCurrency(item.amount)} (${pct}%)`];

            Object.entries(item.methods).forEach(([method, amt]) => {
              lines.push(`   • ${method}: ${formatCurrency(amt)}`);
            });

            return lines;
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

      // Header Banner on first page
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

      // X coordinates for transaction details table columns
      const colX = {
        date: margin + 2, // Date column
        desc: margin + 22, // Description column
        cat: margin + 88, // Category column
        method: margin + 120, // Payment method column
        amount: margin + contentW - 2, // Amount column (align: right)
      };

      // Function to draw table header for transactions
      const drawTransactionHeader = (yPos: number) => {
        doc.setFillColor(245, 245, 240);
        doc.rect(margin, yPos, contentW, 6, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(50, 50, 50);

        doc.text('Tanggal', colX.date, yPos + 4);
        doc.text('Deskripsi', colX.desc, yPos + 4);
        doc.text('Kategori', colX.cat, yPos + 4);
        doc.text('Jenis Kas', colX.method, yPos + 4);
        doc.text('Jumlah', colX.amount, yPos + 4, { align: 'right' });
      };

      // Helper to handle pagination safely
      const checkPageLimit = (neededSpace: number, isTransactionTable = false) => {
        if (y + neededSpace > 280) {
          doc.addPage();
          y = 20;
          if (isTransactionTable) {
            drawTransactionHeader(y);
            y += 6;
          }
          return true;
        }
        return false;
      };

      // 1. Rincian Saldo & Arus Kas per Jenis Kas
      checkPageLimit(35);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 25, 22);
      doc.text('Rincian Saldo & Arus Kas per Jenis Kas', margin, y);
      y += 5;

      // Table Header for Saldo
      doc.setFillColor(245, 245, 240);
      doc.rect(margin, y, contentW, 6, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(50, 50, 50);
      doc.text('Jenis Kas', margin + 4, y + 4);
      doc.text('Pemasukan', margin + contentW - 75, y + 4, { align: 'right' });
      doc.text('Pengeluaran', margin + contentW - 40, y + 4, { align: 'right' });
      doc.text('Sisa Saldo', margin + contentW - 4, y + 4, { align: 'right' });
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      balanceByPaymentMethod.forEach((item, idx) => {
        checkPageLimit(6);
        if (idx % 2 === 0) {
          doc.setFillColor(252, 252, 250);
          doc.rect(margin, y, contentW, 6, 'F');
        }
        doc.setDrawColor(230, 230, 225);
        doc.setLineWidth(0.1);
        doc.line(margin, y, margin + contentW, y);
        doc.text(item.method, margin + 4, y + 4.2);

        // Pemasukan
        doc.setTextColor(26, 107, 74);
        doc.text(formatCurrency(item.income), margin + contentW - 75, y + 4.2, { align: 'right' });

        // Pengeluaran
        doc.setTextColor(185, 48, 48);
        doc.text(formatCurrency(item.expense), margin + contentW - 40, y + 4.2, { align: 'right' });

        // Sisa Saldo
        if (item.amount >= 0) {
          doc.setTextColor(26, 107, 74);
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setTextColor(185, 48, 48);
          doc.setFont('helvetica', 'bold');
        }
        doc.text(formatCurrency(item.amount), margin + contentW - 4, y + 4.2, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        y += 6;
      });
      doc.setDrawColor(230, 230, 225);
      doc.line(margin, y, margin + contentW, y); // closing line
      y += 10;

      // 2. Rincian Pengeluaran per Kategori
      checkPageLimit(40);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 25, 22);
      doc.text('Rincian Pengeluaran per Kategori', margin, y);
      y += 5;

      // Table Header for Expense
      doc.setFillColor(245, 245, 240);
      doc.rect(margin, y, contentW, 6, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(50, 50, 50);
      doc.text('Kategori', margin + 4, y + 4);
      doc.text('Total Pengeluaran', margin + contentW - 35, y + 4, { align: 'right' });
      doc.text('Persentase', margin + contentW - 4, y + 4, { align: 'right' });
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      if (expenseByCategory.length === 0) {
        checkPageLimit(6);
        doc.setDrawColor(230, 230, 225);
        doc.setLineWidth(0.1);
        doc.line(margin, y, margin + contentW, y);
        doc.text('Belum ada catatan pengeluaran pada periode ini.', margin + 4, y + 4.2);
        y += 6;
      } else {
        expenseByCategory.forEach((item, idx) => {
          checkPageLimit(9); // Need 9mm for stacked row info (Category + Method details)
          if (idx % 2 === 0) {
            doc.setFillColor(252, 252, 250);
            doc.rect(margin, y, contentW, 9, 'F');
          }
          doc.setDrawColor(230, 230, 225);
          doc.setLineWidth(0.1);
          doc.line(margin, y, margin + contentW, y);

          // Category name
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(50, 50, 50);
          doc.setFontSize(8);
          doc.text(item.category, margin + 4, y + 3.8);

          // Sub-details for cash sources
          const methodDetails = Object.entries(item.methods)
            .map(([method, amt]) => `${method}: ${formatCurrency(amt)}`)
            .join(' | ');
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.5);
          doc.setTextColor(120, 120, 120);
          doc.text(methodDetails, margin + 4, y + 7.5);

          // Total amount
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(185, 48, 48);
          doc.text(formatCurrency(item.amount), margin + contentW - 35, y + 5.5, { align: 'right' });

          // Percentage
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(80, 80, 80);
          doc.text(`${item.percentage.toFixed(1)}%`, margin + contentW - 4, y + 5.5, { align: 'right' });
          y += 9;
        });
      }
      doc.setDrawColor(230, 230, 225);
      doc.line(margin, y, margin + contentW, y); // closing line
      y += 10;

      // 3. Daftar Transaksi Detail
      checkPageLimit(40);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 25, 22);
      doc.text('Daftar Transaksi Detail', margin, y);
      y += 5;

      // Table Header for Transactions
      drawTransactionHeader(y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      if (reportTransactions.length === 0) {
        checkPageLimit(6, true);
        doc.setTextColor(80, 80, 80);
        doc.setDrawColor(230, 230, 225);
        doc.setLineWidth(0.1);
        doc.line(margin, y, margin + contentW, y);
        doc.text('Tidak ada transaksi pada periode ini.', margin + 2, y + 4.2);
        y += 6;
      } else {
        reportTransactions.forEach((tx, idx) => {
          checkPageLimit(6, true);

          // Zebra striping background
          if (idx % 2 === 0) {
            doc.setFillColor(252, 252, 250);
            doc.rect(margin, y, contentW, 6, 'F');
          }

          doc.setTextColor(80, 80, 80);
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'normal');

          doc.setDrawColor(230, 230, 225);
          doc.setLineWidth(0.1);
          doc.line(margin, y, margin + contentW, y);

          const dateStr = new Date(tx.date).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });

          let descStr = tx.description || '-';
          if (descStr.length > 40) {
            descStr = `${descStr.substring(0, 37)}...`;
          }

          const amountStr = (tx.type === 'pemasukan' ? '+' : '-') + formatCurrency(tx.amount);

          doc.text(dateStr, colX.date, y + 4.2);
          doc.text(descStr, colX.desc, y + 4.2);
          doc.text(tx.category || '-', colX.cat, y + 4.2);
          doc.text(tx.method || 'Tunai', colX.method, y + 4.2);

          // Color amount cell
          if (tx.type === 'pemasukan') {
            doc.setTextColor(26, 107, 74);
            doc.setFont('helvetica', 'bold');
          } else {
            doc.setTextColor(185, 48, 48);
            doc.setFont('helvetica', 'bold');
          }
          doc.text(amountStr, colX.amount, y + 4.2, { align: 'right' });
          y += 6;
        });
      }
      doc.setTextColor(80, 80, 80);
      doc.setDrawColor(230, 230, 225);
      doc.setLineWidth(0.1);
      doc.line(margin, y, margin + contentW, y); // closing line

      // Add Page Numbers and Footer on all pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.setDrawColor(220, 220, 215);
        doc.setLineWidth(0.1);
        doc.line(margin, 282, margin + contentW, 282); // divider line above footer

        doc.text(`Halaman ${i} dari ${totalPages}`, margin, 287);
        doc.text('KasKu - Laporan Keuangan Bhineka Djaya Primasatya', margin + contentW, 287, { align: 'right' });
      }

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

  const handleDownloadCSV = () => {
    try {
      const headers = ['Tanggal', 'Deskripsi', 'Kategori', 'Kas / Metode', 'Jenis', 'Jumlah', 'Catatan'];
      const rows = reportTransactions.map((t) => [
        t.date,
        `"${t.description.replace(/"/g, '""')}"`,
        `"${(t.category || '-').replace(/"/g, '""')}"`,
        `"${(t.method || 'Tunai').replace(/"/g, '""')}"`,
        t.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran',
        t.amount,
        `"${(t.note || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
      const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      const periodText: Record<string, string> = {
        all: 'Semua_Waktu',
        month: 'Bulan_Ini',
        '3months': '3_Bulan_Terakhir',
        year: 'Tahun_Ini',
      };
      link.setAttribute('download', `Laporan-Transaksi-${periodText[period] || 'Semua_Waktu'}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('📄 Berhasil mengekspor laporan transaksi ke file CSV!');
    } catch (err) {
      console.error('Error exporting CSV:', err);
      toast.error('Gagal mengekspor CSV.');
    }
  };

  const expenseColumns: Column<ExpenseCategoryRow>[] = [
    { key: 'category', label: 'Kategori', sortable: true },
    {
      key: 'methods',
      label: 'Sumber Kas / Detail',
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {Object.entries(r.methods).map(([method, amt]) => (
            <span
              key={method}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-textMain border border-border"
            >
              {method}: <span className="font-semibold ml-1">{formatCurrency(amt)}</span>
            </span>
          ))}
        </div>
      ),
    },
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

  const balanceColumns: Column<{ method: string; income: number; expense: number; amount: number }>[] = [
    { key: 'method', label: 'Jenis Kas', sortable: true },
    {
      key: 'income',
      label: 'Total Pemasukan',
      align: 'right',
      sortable: true,
      render: (r) => <span className="font-semibold text-income font-[tnum]">{formatCurrency(r.income)}</span>,
    },
    {
      key: 'expense',
      label: 'Total Pengeluaran',
      align: 'right',
      sortable: true,
      render: (r) => <span className="font-semibold text-expense font-[tnum]">{formatCurrency(r.expense)}</span>,
    },
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
              🖨️ Unduh Laporan PDF
            </button>
            <button
              type="button"
              onClick={handleDownloadCSV}
              className="px-4 py-2 bg-surface border border-border text-text2 hover:bg-surface2 hover:text-textMain rounded-lg text-[13px] font-medium transition-colors"
            >
              📥 Ekspor CSV
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
        pagination={true}
        mobileCard={(r) => {
          const total = expenseByCategory.reduce((a, d) => a + d.amount, 0);
          const pct = ((r.amount / total) * 100).toFixed(1);
          return (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-textMain text-[14px]">{r.category}</div>
                  <div className="text-[11.5px] text-text3 mt-0.5">Persentase: {pct}%</div>
                </div>
                <div className="font-bold text-[14px] text-expense font-[tnum]">{formatCurrency(r.amount)}</div>
              </div>
              <div className="flex flex-wrap gap-1 pt-1.5 border-t border-dashed border-border">
                {Object.entries(r.methods).map(([method, amt]) => (
                  <span
                    key={method}
                    className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-[10.5px] text-text2"
                  >
                    {method}: <span className="font-medium ml-1">{formatCurrency(amt)}</span>
                  </span>
                ))}
              </div>
            </div>
          );
        }}
      />

      <DataTable
        title="Rincian Saldo & Arus Kas per Jenis Kas"
        columns={balanceColumns}
        data={balanceByPaymentMethod}
        keyExtractor={(r) => r.method}
        loading={loading}
        defaultSortKey="amount"
        emptyMessage="Belum ada catatan saldo jenis kas pada periode ini."
        pagination={true}
        mobileCard={(r) => (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-textMain text-[14px]">{r.method}</div>
              <div className={`font-bold text-[14px] font-[tnum] ${r.amount >= 0 ? 'text-income' : 'text-expense'}`}>
                {formatCurrency(r.amount)}
              </div>
            </div>
            <div className="flex justify-between text-[11px] text-text3 pt-1 border-t border-dashed border-border">
              <span>
                Masuk: <span className="text-income font-medium font-[tnum]">{formatCurrency(r.income)}</span>
              </span>
              <span>
                Keluar: <span className="text-expense font-medium font-[tnum]">{formatCurrency(r.expense)}</span>
              </span>
            </div>
          </div>
        )}
      />
    </div>
  );
}
