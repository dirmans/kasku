import { useState } from 'react';
import { jsPDF } from 'jspdf';
import { toast } from 'react-hot-toast';
import TransactionTable from '../components/templates/TransactionTable';
import { useAppContext } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function TransactionsPage() {
  const { transactions, categories, paymentMethods, loading, openTransactionModal, handleDeleteTransaction } =
    useAppContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');

  const getCategoryEmoji = (type: string, catName: string): string => {
    const found = categories.find((c) => c.name === catName && c.type === type);
    return found ? found.emoji || '📦' : '📦';
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedType('all');
    setSelectedMethod('all');
    setStartDate('');
    setEndDate('');
    setSortBy('date_desc');
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.note?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory ? t.category === selectedCategory : true;
    const matchesMethod = selectedMethod === 'all' ? true : (t.method || 'Tunai') === selectedMethod;
    const matchesType = selectedType === 'all' ? true : t.type === selectedType;

    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && t.date >= startDate;
    }
    if (endDate) {
      matchesDate = matchesDate && t.date <= endDate;
    }

    return matchesSearch && matchesCategory && matchesMethod && matchesType && matchesDate;
  });

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortBy === 'date_desc') {
      return new Date(b.date).getTime() - new Date(a.date).getTime() || b.id - a.id;
    }
    if (sortBy === 'date_asc') {
      return new Date(a.date).getTime() - new Date(b.date).getTime() || a.id - b.id;
    }
    if (sortBy === 'amount_desc') {
      return Number(b.amount) - Number(a.amount);
    }
    if (sortBy === 'amount_asc') {
      return Number(a.amount) - Number(b.amount);
    }
    return 0;
  });

  const handleDownloadCSV = () => {
    try {
      const headers = ['Tanggal', 'Deskripsi', 'Kategori', 'Kas / Metode', 'Jenis', 'Jumlah', 'Catatan'];
      const rows = sortedTransactions.map((t) => [
        t.date,
        `"${t.description.replace(/"/g, '""')}"`,
        `"${t.category.replace(/"/g, '""')}"`,
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
      link.setAttribute('download', `Detail-Transaksi-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('📄 Berhasil mengekspor detail transaksi ke file CSV!');
    } catch (err) {
      console.error('Error exporting CSV:', err);
      toast.error('Gagal mengekspor CSV.');
    }
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageW = 210;
      const margin = 15;
      const contentW = pageW - margin * 2;

      // Header Banner
      doc.setFillColor(26, 25, 22);
      doc.rect(0, 0, pageW, 35, 'F');

      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('KasKu - Detail Laporan Transaksi', margin, 14);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(160, 158, 150);
      doc.text('Bhineka Djaya Primasatya', margin, 20);
      doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`, margin, 25);
      doc.text(`${sortedTransactions.length} transaksi disaring`, pageW - margin, 20, { align: 'right' });

      let y = 45;

      // Table Columns: Date, Desc, Category, Method, Type, Amount
      const colX = {
        date: margin,
        desc: margin + 22,
        cat: margin + 80,
        method: margin + 115,
        type: margin + 142,
        amount: margin + contentW,
      };

      const drawHeader = (yPos: number) => {
        doc.setFillColor(245, 245, 240);
        doc.rect(margin, yPos, contentW, 6, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(50, 50, 50);
        doc.text('Tanggal', colX.date, yPos + 4);
        doc.text('Deskripsi / Catatan', colX.desc, yPos + 4);
        doc.text('Kategori', colX.cat, yPos + 4);
        doc.text('Jenis Kas', colX.method, yPos + 4);
        doc.text('Tipe', colX.type, yPos + 4);
        doc.text('Jumlah', colX.amount, yPos + 4, { align: 'right' });
      };

      drawHeader(y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);

      if (sortedTransactions.length === 0) {
        doc.text('Tidak ada transaksi yang cocok dengan filter.', margin + 2, y + 4.2);
        y += 6;
      } else {
        sortedTransactions.forEach((tx, idx) => {
          if (y + 10 > 280) {
            doc.addPage();
            y = 20;
            drawHeader(y);
            y += 6;
          }

          if (idx % 2 === 0) {
            doc.setFillColor(252, 252, 250);
            doc.rect(margin, y, contentW, 6, 'F');
          }

          doc.setDrawColor(230, 230, 225);
          doc.setLineWidth(0.1);
          doc.line(margin, y, margin + contentW, y);

          const dateStr = formatDate(tx.date);
          let descStr = tx.description || '-';
          if (tx.note) descStr += ` (${tx.note})`;
          if (descStr.length > 38) {
            descStr = `${descStr.substring(0, 35)}...`;
          }

          const methodStr = tx.method || 'Tunai';
          const typeStr = tx.type === 'pemasukan' ? 'Masuk' : 'Keluar';
          const amountStr = (tx.type === 'pemasukan' ? '+' : '-') + formatCurrency(tx.amount);

          doc.text(dateStr, colX.date, y + 4.2);
          doc.text(descStr, colX.desc, y + 4.2);
          doc.text(tx.category || '-', colX.cat, y + 4.2);
          doc.text(methodStr, colX.method, y + 4.2);
          doc.text(typeStr, colX.type, y + 4.2);

          if (tx.type === 'pemasukan') {
            doc.setTextColor(26, 107, 74);
            doc.setFont('helvetica', 'bold');
          } else {
            doc.setTextColor(185, 48, 48);
            doc.setFont('helvetica', 'bold');
          }
          doc.text(amountStr, colX.amount, y + 4.2, { align: 'right' });

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(80, 80, 80);
          y += 6;
        });
      }

      doc.setDrawColor(230, 230, 225);
      doc.line(margin, y, margin + contentW, y);

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
        doc.text('KasKu Keuangan Pribadi', margin + contentW, 287, { align: 'right' });
      }

      doc.save(`Laporan-Detail-Transaksi-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('📄 Berhasil mengekspor detail transaksi ke file PDF!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Gagal mengekspor laporan PDF.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-xl border border-border p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
          <h3 className="font-bold text-[14px] text-textMain uppercase tracking-[0.6px]">Penyaringan Transaksi</h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="px-3 py-1.5 bg-surface border border-border text-text2 hover:bg-surface2 hover:text-textMain rounded-lg text-[12.5px] font-semibold transition-colors flex items-center gap-1.5"
            >
              🖨️ Unduh PDF
            </button>
            <button
              type="button"
              onClick={handleDownloadCSV}
              className="px-3 py-1.5 bg-surface border border-border text-text2 hover:bg-surface2 hover:text-textMain rounded-lg text-[12.5px] font-semibold transition-colors flex items-center gap-1.5"
            >
              📥 Ekspor CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
              Cari Deskripsi/Catatan
            </label>
            <input
              type="text"
              placeholder="Cari kata kunci..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[13px] outline-none focus:border-textMain focus:bg-surface"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
              Jenis Transaksi
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[13px] outline-none focus:border-textMain focus:bg-surface"
            >
              <option value="all">Semua Jenis</option>
              <option value="pemasukan">📈 Pemasukan</option>
              <option value="pengeluaran">📉 Pengeluaran</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
              Kas / Metode
            </label>
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[13px] outline-none focus:border-textMain focus:bg-surface"
            >
              <option value="all">Semua Kas</option>
              {paymentMethods.map((pm) => (
                <option key={pm.id} value={pm.name}>
                  {pm.emoji || '💳'} {pm.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
              Kategori
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[13px] outline-none focus:border-textMain focus:bg-surface"
            >
              <option value="">Semua Kategori</option>
              {Array.from(new Set(categories.map((c) => c.name))).map((catName) => {
                const catObj = categories.find((c) => c.name === catName);
                return (
                  <option key={catObj?.id} value={catName}>
                    {catObj?.emoji || '📑'} {catName}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
              Tanggal Mulai
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[13px] outline-none focus:border-textMain focus:bg-surface"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
              Tanggal Akhir
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[13px] outline-none focus:border-textMain focus:bg-surface"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
              Urutkan
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[13px] outline-none focus:border-textMain focus:bg-surface"
            >
              <option value="date_desc">📅 Tanggal Terbaru</option>
              <option value="date_asc">📅 Tanggal Terlama</option>
              <option value="amount_desc">💰 Jumlah Tertinggi</option>
              <option value="amount_asc">💰 Jumlah Terendah</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full py-2 border border-border rounded-lg bg-transparent text-text2 text-[13px] font-medium hover:bg-surface2 transition-all"
            >
              🔄 Atur Ulang Filter
            </button>
          </div>
        </div>
      </div>

      <TransactionTable
        transactions={sortedTransactions}
        onEdit={openTransactionModal}
        onDelete={handleDeleteTransaction}
        loading={loading}
        pagination={true}
        pageSize={10}
        getCategoryEmoji={getCategoryEmoji}
      />
    </div>
  );
}
