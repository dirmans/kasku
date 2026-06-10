import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip } from 'chart.js';
import { jsPDF } from 'jspdf';
import { useEffect, useMemo, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { toast } from 'react-hot-toast';
import Spinner from '../../components/atoms/Spinner';
import PageHeader from '../../components/molecules/PageHeader';
import DataTable, { type Column } from '../../components/organisms/DataTable';
import { useAppContext } from '../../context/AppContext';
import { useCapitalV2 } from '../../hooks/useCapitalV2';
import { useCustomerInvoices } from '../../hooks/useCustomerInvoices';
import { useSupplierPayments } from '../../hooks/useSupplierPayments';
import { useSuppliers } from '../../hooks/useSuppliers';
import { formatCurrency, formatDate } from '../../utils/formatters';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

interface CustomerReportRow {
  id: number;
  invoice_number: string;
  customer_name: string;
  date: string;
  status: string;
  total_amount: number;
  paid_amount: number;
  remaining: number;
}

interface SupplierPerformanceRow {
  id: number;
  name: string;
  itemsCount: number;
  totalCapital: number;
  estimatedSale: number;
  profit: number;
}

export default function ReportsPageV2() {
  const { session } = useAppContext();
  const { suppliers, loading: loadingSuppliers, fetchSuppliers } = useSuppliers(session);
  const { records: capitalRecords, loading: loadingCapital, fetchRecords } = useCapitalV2(session);
  const { invoices, loading: loadingInvoices, fetchInvoices } = useCustomerInvoices(session);
  const { allPayments, fetchAllPayments } = useSupplierPayments(session);
  const [period, setPeriod] = useState('all');

  useEffect(() => {
    fetchSuppliers();
    fetchRecords();
    fetchInvoices();
    fetchAllPayments();
  }, [fetchSuppliers, fetchRecords, fetchInvoices, fetchAllPayments]);

  // Filter invoices based on period
  const filteredInvoices = useMemo(() => {
    if (period === 'all') return invoices;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfThreeMonths = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return invoices.filter((inv) => {
      const invDate = new Date(inv.date);
      if (period === 'month') {
        return invDate >= startOfMonth;
      }
      if (period === '3months') {
        return invDate >= startOfThreeMonths;
      }
      if (period === 'year') {
        return invDate >= startOfYear;
      }
      return true;
    });
  }, [invoices, period]);

  // Filter capital records based on period
  const filteredCapitalRecords = useMemo(() => {
    if (period === 'all') return capitalRecords;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfThreeMonths = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return capitalRecords.filter((r) => {
      const recordDate = new Date(r.date);
      if (period === 'month') {
        return recordDate >= startOfMonth;
      }
      if (period === '3months') {
        return recordDate >= startOfThreeMonths;
      }
      if (period === 'year') {
        return recordDate >= startOfYear;
      }
      return true;
    });
  }, [capitalRecords, period]);

  // Aggregate stats per supplier based on capital records
  const supplierReports = useMemo<SupplierPerformanceRow[]>(() => {
    const map = new Map<number, { totalCapital: number; totalRevenue: number; itemsCount: number }>();

    filteredCapitalRecords.forEach((record) => {
      if (record.supplier_id) {
        const stats = map.get(record.supplier_id) || { totalCapital: 0, totalRevenue: 0, itemsCount: 0 };
        stats.totalCapital += Number(record.buy_price) * Number(record.quantity);
        stats.totalRevenue += Number(record.sell_price) * Number(record.quantity);
        stats.itemsCount += 1;
        map.set(record.supplier_id, stats);
      }
    });

    return suppliers.map((s) => {
      const stats = map.get(s.id) || { totalCapital: 0, totalRevenue: 0, itemsCount: 0 };
      return {
        id: s.id,
        name: s.name,
        itemsCount: stats.itemsCount,
        totalCapital: stats.totalCapital,
        estimatedSale: stats.totalRevenue,
        profit: stats.totalRevenue - stats.totalCapital,
      };
    });
  }, [suppliers, filteredCapitalRecords]);

  // Customer Invoices formatted report rows
  const customerReports = useMemo<CustomerReportRow[]>(() => {
    return filteredInvoices.map((inv) => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      customer_name: inv.customer_name,
      date: inv.date,
      status: inv.status,
      total_amount: inv.total_amount,
      paid_amount: inv.status === 'lunas' ? inv.total_amount : inv.paid_amount,
      remaining: inv.status === 'lunas' ? 0 : inv.total_amount - inv.paid_amount,
    }));
  }, [filteredInvoices]);

  // Overall financial summary metrics
  const overallStats = useMemo(() => {
    let totalSales = 0;
    let totalCollected = 0;
    let totalCapitalCost = 0;

    customerReports.forEach((c) => {
      totalSales += c.total_amount;
      totalCollected += c.paid_amount;
    });

    filteredCapitalRecords.forEach((r) => {
      totalCapitalCost += Number(r.buy_price) * Number(r.quantity);
    });

    const totalSupplierPaid = allPayments.reduce((acc, p) => acc + Number(p.amount), 0);
    const remainingSupplierDebt = Math.max(0, totalCapitalCost - totalSupplierPaid);

    return {
      totalSales,
      totalCollected,
      remainingReceivables: Math.max(0, totalSales - totalCollected), // Piutang berjalan pembeli
      totalCapitalCost, // Total Hutang awal
      totalSupplierPaid,
      remainingSupplierDebt,
      estimatedProfit: totalSales - totalCapitalCost,
    };
  }, [customerReports, filteredCapitalRecords, allPayments]);

  // Chart 1: Doughnut - Buyer Receivable (Piutang) Distribution
  const receivableReports = useMemo(() => {
    const result = customerReports.filter((c) => c.remaining > 0);
    return result.length ? result : [{ customer_name: 'Semua Lunas / Tidak Ada Piutang', remaining: 1 }];
  }, [customerReports]);

  const doughnutChartData = {
    labels: receivableReports.map((c) => c.customer_name),
    datasets: [
      {
        data: receivableReports.map((c) => c.remaining),
        backgroundColor: ['#b93030', '#c17b2a', '#2456a4', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b', '#f59e0b'].slice(
          0,
          Math.max(1, receivableReports.length),
        ),
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
            const item = receivableReports[idx];
            if (!item || item.customer_name.includes('Semua Lunas')) return ' Tidak ada piutang pembeli';
            const total = receivableReports.reduce((a, c) => a + c.remaining, 0);
            const pct = total > 0 ? ((item.remaining / total) * 100).toFixed(1) : '0';
            return ` ${item.customer_name}: ${formatCurrency(item.remaining)} (${pct}%)`;
          },
        },
      },
    },
  };

  // Chart 2: Bar - Pembelian vs Penjualan per Supplier
  const barChartData = {
    labels: supplierReports.map((s) => s.name).length ? supplierReports.map((s) => s.name) : ['Belum ada data'],
    datasets: [
      {
        label: '📉 Total Modal Beli',
        data: supplierReports.map((s) => s.totalCapital).length ? supplierReports.map((s) => s.totalCapital) : [0],
        backgroundColor: '#b93030',
        borderRadius: 4,
      },
      {
        label: '📈 Estimasi Nilai Jual Aset',
        data: supplierReports.map((s) => s.estimatedSale).length ? supplierReports.map((s) => s.estimatedSale) : [0],
        backgroundColor: '#1a6b4a',
        borderRadius: 4,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { font: { size: 12 } },
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

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const truncateText = (text: string, maxLength: number) => {
        if (text.length > maxLength) {
          return text.substring(0, maxLength - 3) + '...';
        }
        return text;
      };

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
      const contentW = pageW - margin * 2;

      // Header Banner
      doc.setFillColor(26, 25, 22);
      doc.rect(0, 0, pageW, 44, 'F');

      // Text Header
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('KASKU SHOP V2', margin, 16);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(160, 158, 150);
      doc.text('Bhineka Djaya Primasatya', margin, 22);
      doc.text('Laporan Keuangan Komprehensif (Penjualan Pelanggan & Supplier)', margin, 27);
      doc.text(`Periode: ${periodText[period] || 'Semua Waktu'}`, margin, 32);

      doc.text(`Dicetak: ${nowStr}`, pageW - margin, 22, { align: 'right' });
      doc.text(`${invoices.length} nota penjualan`, pageW - margin, 27, {
        align: 'right',
      });

      // Stats Cards
      let y = 56;
      const bw = (contentW - 16) / 5;

      const cards = [
        {
          label: 'Total Penjualan',
          value: formatCurrency(overallStats.totalSales),
          color: [26, 107, 74] as [number, number, number],
          bg: [232, 245, 238] as [number, number, number],
        },
        {
          label: 'Piutang Pelanggan',
          value: formatCurrency(overallStats.remainingReceivables),
          color: [185, 48, 48] as [number, number, number],
          bg: [251, 234, 234] as [number, number, number],
        },
        {
          label: 'Total Belanja Modal',
          value: formatCurrency(overallStats.totalCapitalCost),
          color: [100, 100, 100] as [number, number, number],
          bg: [240, 240, 240] as [number, number, number],
        },
        {
          label: 'Sisa Hutang Supplier',
          value: formatCurrency(overallStats.remainingSupplierDebt),
          color: [185, 48, 48] as [number, number, number],
          bg: [251, 234, 234] as [number, number, number],
        },
        {
          label: 'Laba Bersih Potensi',
          value: formatCurrency(overallStats.estimatedProfit),
          color: overallStats.estimatedProfit >= 0 ? [26, 107, 74] : ([185, 48, 48] as [number, number, number]),
          bg: overallStats.estimatedProfit >= 0 ? [232, 245, 238] : ([251, 234, 234] as [number, number, number]),
        },
      ];

      cards.forEach((b, i) => {
        const x = margin + i * (bw + 4);
        doc.setFillColor(b.bg[0], b.bg[1], b.bg[2]);
        doc.roundedRect(x, y, bw, 22, 3, 3, 'F');
        doc.setFillColor(b.color[0], b.color[1], b.color[2]);
        doc.rect(x, y, bw, 2.5, 'F');

        doc.setTextColor(80, 80, 80);
        doc.setFontSize(6.8);
        doc.setFont('helvetica', 'bold');
        doc.text(b.label, x + 2, y + 8);

        doc.setTextColor(b.color[0], b.color[1], b.color[2]);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(b.value, x + 2, y + 15.5);
      });

      y += 30;

      // Draw Customer Invoices Summary Table
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 25, 22);
      doc.text('Laporan Piutang & Pembayaran Pelanggan', margin, y);
      y += 5;

      const colInvX = {
        invoice: margin,
        customer: margin + 28,
        date: margin + 62,
        status: margin + 82,
        total: margin + 100,
        paid: margin + 124,
        remaining: margin + contentW,
      };

      // Header Table
      doc.setFillColor(245, 245, 240);
      doc.rect(margin, y, contentW, 6, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(50, 50, 50);
      doc.text('No. Nota', colInvX.invoice, y + 4);
      doc.text('Nama Pelanggan', colInvX.customer, y + 4);
      doc.text('Tanggal', colInvX.date, y + 4);
      doc.text('Status', colInvX.status, y + 4);
      doc.text('Belanja', colInvX.total, y + 4);
      doc.text('Telah Bayar', colInvX.paid, y + 4);
      doc.text('Sisa Tagihan', colInvX.remaining, y + 4, { align: 'right' });
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);

      if (customerReports.length === 0) {
        doc.text('Belum ada transaksi penjualan pelanggan yang tercatat.', margin + 2, y + 4.2);
        y += 6;
      } else {
        customerReports.forEach((row, idx) => {
          if (y + 10 > 280) {
            doc.addPage();
            y = 20;
            // Draw Header table again
            doc.setFillColor(245, 245, 240);
            doc.rect(margin, y, contentW, 6, 'F');
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text('No. Nota', colInvX.invoice, y + 4);
            doc.text('Nama Pelanggan', colInvX.customer, y + 4);
            doc.text('Tanggal', colInvX.date, y + 4);
            doc.text('Status', colInvX.status, y + 4);
            doc.text('Belanja', colInvX.total, y + 4);
            doc.text('Telah Bayar', colInvX.paid, y + 4);
            doc.text('Sisa Tagihan', colInvX.remaining, y + 4, { align: 'right' });
            y += 6;
          }

          if (idx % 2 === 0) {
            doc.setFillColor(252, 252, 250);
            doc.rect(margin, y, contentW, 6, 'F');
          }
          doc.setDrawColor(230, 230, 225);
          doc.setLineWidth(0.1);
          doc.line(margin, y, margin + contentW, y);

          const statusText = row.status === 'lunas' ? 'LUNAS' : row.status === 'dp' ? 'DP' : 'BELUM LUNAS';

          doc.text(row.invoice_number, colInvX.invoice, y + 4.2);
          doc.text(truncateText(row.customer_name, 20), colInvX.customer, y + 4.2);
          doc.text(formatDate(row.date), colInvX.date, y + 4.2);
          doc.text(statusText, colInvX.status, y + 4.2);
          doc.text(formatCurrency(row.total_amount), colInvX.total, y + 4.2);
          doc.text(formatCurrency(row.paid_amount), colInvX.paid, y + 4.2);

          if (row.remaining > 0) {
            doc.setTextColor(185, 48, 48);
            doc.setFont('helvetica', 'bold');
          } else {
            doc.setTextColor(26, 107, 74);
          }
          doc.text(formatCurrency(row.remaining), colInvX.remaining, y + 4.2, { align: 'right' });

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(80, 80, 80);
          y += 6;
        });
      }
      doc.setDrawColor(230, 230, 225);
      doc.line(margin, y, margin + contentW, y);
      y += 12;

      // Table 3: Supplier performance
      if (y + 30 > 280) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 25, 22);
      doc.text('Laporan Performa Keuntungan Supplier', margin, y);
      y += 5;

      const colSupX = {
        name: margin,
        qty: margin + 52,
        capital: margin + 75,
        revenue: margin + 115,
        profit: margin + contentW,
      };

      // Header Table
      doc.setFillColor(245, 245, 240);
      doc.rect(margin, y, contentW, 6, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(50, 50, 50);
      doc.text('Nama Supplier', colSupX.name, y + 4);
      doc.text('Jumlah Aset', colSupX.qty, y + 4);
      doc.text('Total Modal', colSupX.capital, y + 4);
      doc.text('Estimasi Jual', colSupX.revenue, y + 4);
      doc.text('Estimasi Profit', colSupX.profit, y + 4, { align: 'right' });
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      supplierReports.forEach((row, idx) => {
        if (y + 10 > 280) {
          doc.addPage();
          y = 20;
        }

        if (idx % 2 === 0) {
          doc.setFillColor(252, 252, 250);
          doc.rect(margin, y, contentW, 6, 'F');
        }
        doc.setDrawColor(230, 230, 225);
        doc.setLineWidth(0.1);
        doc.line(margin, y, margin + contentW, y);

        doc.text(truncateText(row.name, 25), colSupX.name, y + 4.2);
        doc.text(`${row.itemsCount} barang`, colSupX.qty, y + 4.2);
        doc.text(formatCurrency(row.totalCapital), colSupX.capital, y + 4.2);
        doc.text(formatCurrency(row.estimatedSale), colSupX.revenue, y + 4.2);

        if (row.profit >= 0) {
          doc.setTextColor(26, 107, 74);
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setTextColor(185, 48, 48);
          doc.setFont('helvetica', 'bold');
        }
        doc.text(formatCurrency(row.profit), colSupX.profit, y + 4.2, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        y += 6;
      });
      doc.setDrawColor(230, 230, 225);
      doc.line(margin, y, margin + contentW, y);

      // Add Page Numbers
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.setDrawColor(220, 220, 215);
        doc.setLineWidth(0.1);
        doc.line(margin, 282, margin + contentW, 282);

        doc.text(`Halaman ${i} dari ${totalPages}`, margin, 287);
        doc.text('KasKu V2 - Laporan Finansial Komprehensif', margin + contentW, 287, { align: 'right' });
      }

      doc.save(
        `Laporan-Finansial_Komprehensif-KasKu_V2-${(periodText[period] || 'Semua_Waktu').replace(/ /g, '_')}.pdf`,
      );
      toast.success('📄 Laporan Finansial Komprehensif PDF berhasil diunduh!');
    } catch (error) {
      console.error('Error generating PDF comprehensive report:', error);
    }
  };
  const handleDownloadCSV = () => {
    try {
      const headers = [
        'Tanggal',
        'Nama Barang',
        'Supplier',
        'Kuantitas',
        'Berat (kg)',
        'Harga / kg',
        'Harga Beli',
        'Harga Jual',
        'Estimasi Profit',
        'Catatan',
      ];
      const rows = filteredCapitalRecords.map((r) => {
        const supplierName = r.suppliers?.name || '-';
        const profit = Number(r.sell_price) > 0 ? (Number(r.sell_price) - Number(r.buy_price)) * Number(r.quantity) : 0;
        return [
          r.date,
          `"${r.item_name.replace(/"/g, '""')}"`,
          `"${supplierName.replace(/"/g, '""')}"`,
          r.quantity,
          r.weight || '',
          r.price_per_kg || '',
          r.buy_price,
          r.sell_price,
          profit,
          `"${(r.note || '').replace(/"/g, '""')}"`,
        ];
      });

      const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
      const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Rincian-Inventaris-Modal-V2-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('📄 Rincian Inventaris berhasil diunduh dalam format CSV!');
    } catch (err) {
      console.error('Error exporting CSV:', err);
      toast.error('Gagal mengunduh CSV.');
    }
  };

  const columns: Column<CustomerReportRow>[] = [
    {
      key: 'invoice_number',
      label: 'No. Nota',
      sortable: true,
      render: (r) => <span className="font-semibold text-textMain">🧾 {r.invoice_number}</span>,
    },
    {
      key: 'customer_name',
      label: 'Pelanggan',
      sortable: true,
      render: (r) => <span className="font-semibold text-textMain">👤 {r.customer_name}</span>,
    },
    {
      key: 'date',
      label: 'Tanggal',
      sortable: true,
      render: (r) => formatDate(r.date),
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      render: (r) => {
        let badge = '';
        if (r.status === 'lunas') badge = 'bg-incomeBg text-income border-income/10';
        else if (r.status === 'dp') badge = 'bg-orange-50 text-accent border-accent/10';
        else badge = 'bg-expenseBg text-expense border-expense/10';
        return (
          <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold border ${badge}`}>
            {r.status === 'lunas' ? 'Lunas' : r.status === 'dp' ? 'DP' : 'Belum Lunas'}
          </span>
        );
      },
    },
    {
      key: 'total_amount',
      label: 'Total Belanja',
      align: 'right',
      sortable: true,
      render: (r) => <span className="font-[tnum] font-bold text-income">{formatCurrency(r.total_amount)}</span>,
    },
    {
      key: 'paid_amount',
      label: 'Telah Bayar',
      align: 'right',
      render: (r) => <span className="font-[tnum]">{formatCurrency(r.paid_amount)}</span>,
    },
    {
      key: 'remaining',
      label: 'Sisa Piutang',
      align: 'right',
      sortable: true,
      render: (r) => {
        const isDebt = r.remaining > 0;
        return (
          <span className={`font-[tnum] font-semibold ${isDebt ? 'text-expense' : 'text-income'}`}>
            {formatCurrency(r.remaining)}
          </span>
        );
      },
    },
  ];

  const supplierColumns: Column<SupplierPerformanceRow>[] = [
    { key: 'name', label: 'Nama Supplier', sortable: true },
    {
      key: 'itemsCount',
      label: 'Jumlah Aset',
      align: 'center',
      sortable: true,
      render: (r) => <span className="font-semibold">{r.itemsCount} barang</span>,
    },
    {
      key: 'totalCapital',
      label: 'Total Belanja Modal',
      align: 'right',
      sortable: true,
      render: (r) => <span className="font-[tnum] text-expense font-semibold">{formatCurrency(r.totalCapital)}</span>,
    },
    {
      key: 'estimatedSale',
      label: 'Estimasi Jual',
      align: 'right',
      sortable: true,
      render: (r) => <span className="font-[tnum] text-income font-semibold">{formatCurrency(r.estimatedSale)}</span>,
    },
    {
      key: 'profit',
      label: 'Estimasi Profit',
      align: 'right',
      sortable: true,
      render: (r) => (
        <span className={`font-[tnum] font-bold ${r.profit >= 0 ? 'text-income' : 'text-expense'}`}>
          {r.profit >= 0 ? '+' : ''}
          {formatCurrency(r.profit)}
        </span>
      ),
    },
  ];

  const capitalColumns: Column<any>[] = [
    {
      key: 'date',
      label: 'Tanggal',
      sortable: true,
      render: (r) => formatDate(r.date),
    },
    {
      key: 'item_name',
      label: 'Barang / Modal',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-semibold text-textMain">{r.item_name}</div>
          {r.weight && r.price_per_kg && (
            <div className="text-[11px] font-medium text-accent mt-0.5">
              ⚖️ {r.weight} kg @ {formatCurrency(r.price_per_kg)}/kg
            </div>
          )}
          {r.note && <div className="text-[11px] text-text3 mt-0.5">{r.note}</div>}
        </div>
      ),
    },
    {
      key: 'supplier',
      label: 'Supplier',
      render: (r) => (
        <span className="text-[12.5px] font-semibold text-accent">
          {r.suppliers?.name ? `🏢 ${r.suppliers.name}` : '-'}
        </span>
      ),
    },
    {
      key: 'quantity',
      label: 'Qty',
      align: 'center',
      sortable: true,
      render: (r) => <span className="font-[tnum]">{r.quantity}</span>,
    },
    {
      key: 'buy_price',
      label: 'Harga Beli',
      align: 'right',
      sortable: true,
      render: (r) => <span className="font-[tnum] text-expense">{formatCurrency(r.buy_price)}</span>,
    },
    {
      key: 'sell_price',
      label: 'Harga Jual',
      align: 'right',
      sortable: true,
      render: (r) => {
        if (Number(r.sell_price) === 0) {
          return <span className="text-[11.5px] text-text3 italic">Belum terjual</span>;
        }
        return <span className="font-[tnum] text-income">{formatCurrency(r.sell_price)}</span>;
      },
    },
    {
      key: 'profit',
      label: 'Profit Estimasi',
      align: 'right',
      sortable: true,
      render: (r) => {
        if (Number(r.sell_price) === 0) {
          return <span className="text-text3">-</span>;
        }
        const profitVal = (Number(r.sell_price) - Number(r.buy_price)) * Number(r.quantity);
        return (
          <span className={`font-[tnum] font-bold ${profitVal >= 0 ? 'text-income' : 'text-expense'}`}>
            {profitVal > 0 ? '+' : ''}
            {formatCurrency(profitVal)}
          </span>
        );
      },
    },
  ];

  const isLoading = loadingSuppliers || loadingCapital || loadingInvoices;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Penjualan & Piutang Komprehensif (V2)"
        subtitle="Analisis perbandingan penjualan pelanggan, pembayaran piutang berjalan, serta performa keuntungan supplier"
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
              📥 Unduh PDF Laporan
            </button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Section Piutang Pelanggan */}
        <div className="bg-surface rounded-xl border border-border p-4 shadow-sm space-y-3">
          <h4 className="text-[11px] font-bold text-accent uppercase tracking-wider">🔵 Arus Piutang Pelanggan</h4>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-[10px] text-text3 uppercase font-medium">Penjualan</span>
              <div className="font-bold text-[12px] font-[tnum] text-textMain">
                {formatCurrency(overallStats.totalSales)}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-text3 uppercase font-medium">Diterima</span>
              <div className="font-bold text-[12px] font-[tnum] text-income">
                {formatCurrency(overallStats.totalCollected)}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-text3 uppercase font-medium">Sisa Piutang</span>
              <div className="font-bold text-[12px] font-[tnum] text-expense">
                {formatCurrency(overallStats.remainingReceivables)}
              </div>
            </div>
          </div>
        </div>

        {/* Section Hutang Supplier */}
        <div className="bg-surface rounded-xl border border-border p-4 shadow-sm space-y-3">
          <h4 className="text-[11px] font-bold text-expense uppercase tracking-wider">🔴 Arus Hutang Supplier</h4>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-[10px] text-text3 uppercase font-medium">Hutang Awal</span>
              <div className="font-bold text-[12px] font-[tnum] text-textMain">
                {formatCurrency(overallStats.totalCapitalCost)}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-text3 uppercase font-medium">Terbayar</span>
              <div className="font-bold text-[12px] font-[tnum] text-income">
                {formatCurrency(overallStats.totalSupplierPaid)}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-text3 uppercase font-medium">Sisa Hutang</span>
              <div className="font-bold text-[12px] font-[tnum] text-expense">
                {formatCurrency(overallStats.remainingSupplierDebt)}
              </div>
            </div>
          </div>
        </div>

        {/* Section Profit & Kinerja */}
        <div className="bg-surface rounded-xl border border-border p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-text2 uppercase tracking-wider">💰 Potensi Laba Bersih</span>
          <div className="flex justify-between items-baseline pt-2">
            <span
              className={`text-[19px] font-bold font-[tnum] ${overallStats.estimatedProfit >= 0 ? 'text-income' : 'text-expense'}`}
            >
              {overallStats.estimatedProfit >= 0 ? '+' : ''}
              {formatCurrency(overallStats.estimatedProfit)}
            </span>
            <span className="text-[10px] text-text3 italic">Estimasi Penjualan - Modal</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface rounded-xl border border-border p-5 shadow-sm md:col-span-2">
          <h3 className="font-bold text-[14px] text-textMain uppercase tracking-[0.6px] mb-4">
            Keuntungan & Performa per Supplier
          </h3>
          <div className="h-[280px]">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <Spinner size="lg" />
              </div>
            ) : (
              <Bar data={barChartData} options={barChartOptions} />
            )}
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
          <h3 className="font-bold text-[14px] text-textMain uppercase tracking-[0.6px] mb-4">
            Alokasi Piutang Pelanggan
          </h3>
          <div className="h-[280px] flex items-center justify-center">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <Spinner size="lg" />
              </div>
            ) : (
              <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
            )}
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <DataTable
        title="Ringkasan Nota Penjualan & Piutang Pelanggan"
        columns={columns}
        data={customerReports}
        keyExtractor={(r) => r.id}
        loading={isLoading}
        defaultSortKey="total_amount"
        emptyMessage="Belum ada data nota penjualan pelanggan."
        pagination={true}
        mobileCard={(c) => (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="font-semibold text-textMain text-[14px]">🧾 {c.invoice_number}</div>
              <div className="text-[11.5px] text-text2 font-semibold">👤 {c.customer_name}</div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[12px] pt-2 border-t border-border/50">
              <div>
                <div className="text-text3 text-[9px] uppercase font-semibold mb-0.5">Belanja</div>
                <div className="font-semibold text-income">{formatCurrency(c.total_amount)}</div>
              </div>
              <div>
                <div className="text-text3 text-[9px] uppercase font-semibold mb-0.5">Terbayar</div>
                <div className="font-semibold text-income">{formatCurrency(c.paid_amount)}</div>
              </div>
              <div>
                <div className="text-text3 text-[9px] uppercase font-semibold mb-0.5">Piutang</div>
                <div className={`font-bold ${c.remaining > 0 ? 'text-expense' : 'text-income'}`}>
                  {formatCurrency(c.remaining)}
                </div>
              </div>
            </div>
          </div>
        )}
      />

      {/* Supplier Performance Table */}
      <DataTable
        title="Laporan Performa Keuntungan Supplier"
        columns={supplierColumns}
        data={supplierReports}
        keyExtractor={(r) => r.id}
        loading={isLoading}
        defaultSortKey="profit"
        emptyMessage="Belum ada data performa supplier."
        pagination={true}
        mobileCard={(s) => (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="font-semibold text-textMain text-[14px]">🏢 {s.name}</div>
              <div className="text-[11.5px] text-text3">{s.itemsCount} barang</div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[12px] pt-2 border-t border-border/50">
              <div>
                <div className="text-text3 text-[9px] uppercase font-semibold mb-0.5">Total Modal</div>
                <div className="font-semibold text-expense">{formatCurrency(s.totalCapital)}</div>
              </div>
              <div>
                <div className="text-text3 text-[9px] uppercase font-semibold mb-0.5">Estimasi Jual</div>
                <div className="font-semibold text-income">{formatCurrency(s.estimatedSale)}</div>
              </div>
              <div>
                <div className="text-text3 text-[9px] uppercase font-semibold mb-0.5">Profit</div>
                <div className={`font-bold ${s.profit >= 0 ? 'text-income' : 'text-expense'}`}>
                  {formatCurrency(s.profit)}
                </div>
              </div>
            </div>
          </div>
        )}
      />

      {/* Capital Records Detail Table */}
      <DataTable
        title="Rincian Inventaris & Barang Modal V2"
        actions={
          <button
            type="button"
            onClick={handleDownloadCSV}
            className="px-3 py-1 bg-surface border border-border text-text2 hover:bg-surface2 hover:text-textMain rounded-lg text-[12.5px] font-semibold transition-colors flex items-center gap-1.5"
          >
            📥 Ekspor CSV
          </button>
        }
        columns={capitalColumns}
        data={filteredCapitalRecords}
        keyExtractor={(r) => r.id}
        loading={isLoading}
        defaultSortKey="date"
        emptyMessage="Belum ada data barang modal/inventaris."
        pagination={true}
        mobileCard={(r) => {
          const profitVal = (Number(r.sell_price) - Number(r.buy_price)) * Number(r.quantity);
          const hasSold = Number(r.sell_price) > 0;
          return (
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-textMain text-[14px]">{r.item_name}</div>
                  <div className="text-[11px] text-text3 mt-0.5">
                    {formatDate(r.date)} • Qty: {r.quantity}
                  </div>
                  {r.weight && r.price_per_kg && (
                    <div className="text-[11px] font-semibold text-accent mt-0.5">
                      ⚖️ {r.weight} kg @ {formatCurrency(r.price_per_kg)}/kg
                    </div>
                  )}
                  {r.suppliers?.name && (
                    <div className="text-[11px] font-semibold text-accent mt-0.5">🏢 {r.suppliers.name}</div>
                  )}
                  {r.note && <div className="text-[11px] text-text2 mt-1 italic">{r.note}</div>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[12px] pt-2 border-t border-border/50">
                <div>
                  <div className="text-text3 text-[9px] uppercase font-semibold mb-0.5">Harga Beli</div>
                  <div className="font-semibold text-expense">{formatCurrency(r.buy_price)}</div>
                </div>
                <div>
                  <div className="text-text3 text-[9px] uppercase font-semibold mb-0.5">Harga Jual</div>
                  <div className="font-semibold text-income">
                    {hasSold ? (
                      formatCurrency(r.sell_price)
                    ) : (
                      <span className="italic text-[11px] text-text3">Belum</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-text3 text-[9px] uppercase font-semibold mb-0.5">Profit</div>
                  <div className={`font-bold ${profitVal >= 0 && hasSold ? 'text-income' : 'text-text3'}`}>
                    {hasSold ? formatCurrency(profitVal) : '-'}
                  </div>
                </div>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
