import { jsPDF } from 'jspdf';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import ActionButtons from '../../components/molecules/ActionButtons';
import PageHeader from '../../components/molecules/PageHeader';
import StatCard from '../../components/molecules/StatCard';
import DataTable, { type Column } from '../../components/organisms/DataTable';
import { useAppContext } from '../../context/AppContext';
import { useCapitalV2 } from '../../hooks/useCapitalV2';
import { useSuppliers } from '../../hooks/useSuppliers';
import type { CapitalRecord } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function CapitalPageV2() {
  const { session } = useAppContext();
  const isAuthorized = true;
  const { records, loading, fetchRecords, addRecord, updateRecord, deleteRecord } = useCapitalV2(session);
  const { suppliers, fetchSuppliers } = useSuppliers(session);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [filterSupplierId, setFilterSupplierId] = useState<string>('all');

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [itemName, setItemName] = useState('');
  const [buyPrice, setBuyPrice] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Weight calculator states for item pricing
  const [showWeightCalc, setShowWeightCalc] = useState(false);
  const [weight, setWeight] = useState<number | ''>('');
  const [pricePerKg, setPricePerKg] = useState<number | ''>('');

  useEffect(() => {
    fetchRecords();
    fetchSuppliers();
  }, [fetchRecords, fetchSuppliers]);

  const resetForm = () => {
    setEditingId(null);
    setItemName('');
    setBuyPrice('');
    setQuantity(1);
    setDate(new Date().toISOString().split('T')[0]);
    setNote('');
    setSupplierId('');
    setShowForm(false);
    setWeight('');
    setPricePerKg('');
    setShowWeightCalc(false);
  };

  const handleEdit = (record: CapitalRecord) => {
    setEditingId(record.id);
    setItemName(record.item_name);
    setBuyPrice(record.buy_price);
    setQuantity(record.quantity);
    setDate(record.date);
    setNote(record.note || '');
    setSupplierId(record.supplier_id ? record.supplier_id.toString() : '');
    setWeight(record.weight || '');
    setPricePerKg(record.price_per_kg || '');
    setShowWeightCalc(!!record.weight);
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return toast.error('Sesi tidak valid.');
    if (!itemName.trim()) return toast.error('Nama barang harus diisi');

    setSubmitting(true);
    try {
      const payload = {
        user_id: session.user.id,
        item_name: itemName.trim(),
        buy_price: Number(buyPrice) || 0,
        sell_price: editingId ? records.find((r) => r.id === editingId)?.sell_price || 0 : 0,
        quantity: Number(quantity) || 1,
        date,
        note: note.trim(),
        supplier_id: supplierId ? Number.parseInt(supplierId, 10) : null,
        weight: showWeightCalc && weight ? Number(weight) : null,
        price_per_kg: showWeightCalc && pricePerKg ? Number(pricePerKg) : null,
      };

      if (editingId) {
        await updateRecord(editingId, payload);
      } else {
        await addRecord(payload);
      }

      toast.success(editingId ? 'Data berhasil diperbarui!' : 'Data berhasil ditambahkan!');
      resetForm();
      fetchRecords();
    } catch (error) {
      console.error('Error saving capital record V2:', error);
      toast.error('Gagal menyimpan data modal. Pastikan kolom supplier_id telah ditambahkan di database Anda.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan ini?')) return;
    try {
      await deleteRecord(id);
      toast.success('Data berhasil dihapus');
      fetchRecords();
    } catch (error) {
      const err = error as Error;
      toast.error(`Gagal menghapus catatan: ${err.message}`);
    }
  };

  // Stats
  const stats = useMemo(() => {
    let totalCapital = 0;
    let totalRevenue = 0;
    records.forEach((r) => {
      totalCapital += Number(r.buy_price) * Number(r.quantity);
      totalRevenue += Number(r.sell_price) * Number(r.quantity);
    });
    return {
      capital: totalCapital,
      revenue: totalRevenue,
      profit: totalRevenue - totalCapital,
    };
  }, [records]);

  // Filtered records based on search, sort, and supplier
  const filteredRecords = useMemo(() => {
    let result = records;

    // Filter by supplier
    if (filterSupplierId !== 'all') {
      const supId = Number.parseInt(filterSupplierId, 10);
      result = result.filter((r) => r.supplier_id === supId);
    }

    // Filter by search term
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          r.item_name.toLowerCase().includes(lowerSearch) ||
          r.note?.toLowerCase().includes(lowerSearch) ||
          (r.suppliers && r.suppliers.name.toLowerCase().includes(lowerSearch)),
      );
    }

    return result;
  }, [records, searchTerm, filterSupplierId]);

  // Sorted records
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime() || b.id - a.id;
      if (sortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime() || a.id - b.id;
      if (sortBy === 'name_asc') return a.item_name.localeCompare(b.item_name);
      if (sortBy === 'name_desc') return b.item_name.localeCompare(a.item_name);

      const profitA = (Number(a.sell_price) - Number(a.buy_price)) * Number(a.quantity);
      const profitB = (Number(b.sell_price) - Number(b.buy_price)) * Number(b.quantity);
      if (sortBy === 'profit_desc') return profitB - profitA;
      if (sortBy === 'profit_asc') return profitA - profitB;
      return 0;
    });
  }, [filteredRecords, sortBy]);

  // Processed records with profit field pre-calculated for table sorting
  const processedRecords = useMemo(() => {
    return sortedRecords.map((r) => ({
      ...r,
      profit: (Number(r.sell_price) - Number(r.buy_price)) * Number(r.quantity),
    }));
  }, [sortedRecords]);

  const handleDownloadCSV = () => {
    try {
      const headers = [
        'Tanggal',
        'Barang/Modal',
        'Supplier',
        'Kuantitas (Qty)',
        'Harga Beli (Satuan)',
        'Harga Jual (Satuan)',
        'Total Beli',
        'Total Jual',
        'Profit Estimasi',
        'Catatan',
      ];
      const rows = processedRecords.map((r) => {
        const totalBuy = Number(r.buy_price) * Number(r.quantity);
        const totalSell = Number(r.sell_price) * Number(r.quantity);
        const hasSold = Number(r.sell_price) > 0;
        const profit = hasSold ? (Number(r.sell_price) - Number(r.buy_price)) * Number(r.quantity) : 0;

        let itemNameWithDetails = r.item_name;
        if (r.weight && r.price_per_kg) {
          itemNameWithDetails += ` (${r.weight} kg @ ${r.price_per_kg}/kg)`;
        }

        return [
          r.date,
          `"${itemNameWithDetails.replace(/"/g, '""')}"`,
          `"${(r.suppliers?.name || '').replace(/"/g, '""')}"`,
          r.quantity,
          r.buy_price,
          r.sell_price,
          totalBuy,
          totalSell,
          hasSold ? profit : '-',
          `"${(r.note || '').replace(/"/g, '""')}"`,
        ];
      });

      const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
      const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Detail-Modal-V2-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('📄 Berhasil mengekspor detail modal (V2) ke file CSV!');
    } catch (err) {
      console.error('Error exporting CSV V2:', err);
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
      const margin = 12;
      const contentW = pageW - margin * 2;

      // Header Banner
      doc.setFillColor(26, 25, 22);
      doc.rect(0, 0, pageW, 35, 'F');

      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('KasKu - Laporan Detail Modal & Stok (V2)', margin, 14);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(160, 158, 150);
      doc.text('Bhineka Djaya Primasatya', margin, 20);
      doc.text(
        `Dicetak: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`,
        margin,
        25,
      );
      doc.text(`${processedRecords.length} item disaring`, pageW - margin, 20, { align: 'right' });

      let y = 45;

      const colX = {
        date: margin,
        item: margin + 20,
        supplier: margin + 78,
        qty: margin + 112,
        buy: margin + 128,
        sell: margin + 155,
        profit: margin + contentW,
      };

      const drawHeader = (yPos: number) => {
        doc.setFillColor(245, 245, 240);
        doc.rect(margin, yPos, contentW, 6, 'F');
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(50, 50, 50);
        doc.text('Tanggal', colX.date, yPos + 4);
        doc.text('Barang / Modal', colX.item, yPos + 4);
        doc.text('Supplier', colX.supplier, yPos + 4);
        doc.text('Qty', colX.qty, yPos + 4, { align: 'center' });
        doc.text('Harga Beli', colX.buy, yPos + 4, { align: 'right' });
        doc.text('Harga Jual', colX.sell, yPos + 4, { align: 'right' });
        doc.text('Estimasi Profit', colX.profit, yPos + 4, { align: 'right' });
      };

      drawHeader(y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);

      if (processedRecords.length === 0) {
        doc.text('Tidak ada data modal yang cocok dengan filter.', margin + 2, y + 4.2);
        y += 6;
      } else {
        processedRecords.forEach((r, idx) => {
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

          const dateStr = formatDate(r.date);
          let itemStr = r.item_name || '-';
          if (r.weight && r.price_per_kg) {
            itemStr += ` (${r.weight}kg@${Math.round(r.price_per_kg / 1000)}k)`;
          }
          if (r.note) itemStr += ` (${r.note})`;
          if (itemStr.length > 34) {
            itemStr = `${itemStr.substring(0, 31)}...`;
          }

          const supplierStr = r.suppliers?.name ? r.suppliers.name : '-';
          const buyStr = formatCurrency(r.buy_price);
          const hasSold = Number(r.sell_price) > 0;
          const sellStr = hasSold ? formatCurrency(r.sell_price) : 'Belum';

          const marginVal = hasSold ? (Number(r.sell_price) - Number(r.buy_price)) * Number(r.quantity) : 0;
          const profitStr = hasSold ? (marginVal > 0 ? '+' : '') + formatCurrency(marginVal) : '-';

          doc.setFontSize(7.5);
          doc.text(dateStr, colX.date, y + 4.2);
          doc.text(itemStr, colX.item, y + 4.2);
          doc.text(supplierStr.length > 18 ? `${supplierStr.substring(0, 16)}..` : supplierStr, colX.supplier, y + 4.2);
          doc.text(String(r.quantity), colX.qty, y + 4.2, { align: 'center' });
          doc.text(buyStr, colX.buy, y + 4.2, { align: 'right' });
          doc.text(sellStr, colX.sell, y + 4.2, { align: 'right' });

          if (hasSold) {
            if (marginVal >= 0) {
              doc.setTextColor(26, 107, 74);
            } else {
              doc.setTextColor(185, 48, 48);
            }
            doc.setFont('helvetica', 'bold');
          } else {
            doc.setTextColor(120, 120, 120);
          }
          doc.text(profitStr, colX.profit, y + 4.2, { align: 'right' });

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(80, 80, 80);
          y += 6;
        });
      }

      doc.setDrawColor(230, 230, 225);
      doc.line(margin, y, margin + contentW, y);

      // Summary totals at the bottom of the PDF
      if (y + 25 > 280) {
        doc.addPage();
        y = 20;
      }
      y += 5;
      doc.setFillColor(250, 250, 245);
      doc.rect(margin, y, contentW, 18, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('RINGKASAN TOTAL:', margin + 4, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Modal: ${formatCurrency(stats.capital)}`, margin + 4, y + 12);
      doc.text(`Estimasi Pendapatan: ${formatCurrency(stats.revenue)}`, margin + 70, y + 12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Potensi Profit: ${formatCurrency(stats.profit)}`, margin + 140, y + 12);

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

      doc.save(`Laporan-Detail-Modal-V2-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('📄 Berhasil mengekspor detail modal (V2) ke file PDF!');
    } catch (error) {
      console.error('Error generating PDF V2:', error);
      toast.error('Gagal mengekspor laporan PDF.');
    }
  };

  const columns: Column<CapitalRecord & { profit: number }>[] = [
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
          {r.note && <div className="text-[10.5px] font-normal text-text3 mt-0.5">{r.note}</div>}
        </div>
      ),
    },
    {
      key: 'supplier_id',
      label: 'Supplier',
      render: (r) => (
        <span className="text-[12.5px] font-medium text-accent">
          {r.suppliers?.name ? `🏢 ${r.suppliers.name}` : '-'}
        </span>
      ),
    },
    {
      key: 'quantity',
      label: 'Qty',
      align: 'center',
      sortable: true,
      render: (r) => <span className="font-[tnum] font-medium">{r.quantity}</span>,
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
          return <span className="text-[12.5px] font-normal text-text3 italic">Belum terjual</span>;
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
          return <span className="text-text3 font-medium">-</span>;
        }
        const margin = (Number(r.sell_price) - Number(r.buy_price)) * Number(r.quantity);
        return (
          <span className={`font-bold font-[tnum] ${margin >= 0 ? 'text-income' : 'text-expense'}`}>
            {margin > 0 ? '+' : ''}
            {formatCurrency(margin)}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Aksi',
      align: 'center',
      render: (r) => (
        <div className="flex justify-center">
          <ActionButtons onEdit={() => handleEdit(r)} onDelete={() => handleDelete(r.id)} />
        </div>
      ),
    },
  ];

  const mobileCard = (r: CapitalRecord) => {
    const hasSold = Number(r.sell_price) > 0;
    const margin = hasSold ? (Number(r.sell_price) - Number(r.buy_price)) * Number(r.quantity) : 0;
    return (
      <>
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="font-semibold text-textMain text-[14px]">{r.item_name}</div>
            <div className="text-[11.5px] text-text3 mt-0.5">
              {formatDate(r.date)} • Qty: {r.quantity}
            </div>
            {r.suppliers?.name && (
              <div className="text-[11px] font-semibold text-accent mt-0.5">🏢 {r.suppliers.name}</div>
            )}
            {r.note && <div className="text-[11px] font-normal text-text2 mt-1">{r.note}</div>}
          </div>
          {isAuthorized && <ActionButtons onEdit={() => handleEdit(r)} onDelete={() => handleDelete(r.id)} />}
        </div>
        <div className="grid grid-cols-2 gap-3 text-[12px] pt-3 border-t border-border/50">
          <div>
            <div className="text-text3 text-[10px] uppercase font-semibold mb-0.5">Harga Beli</div>
            <div className="font-bold font-[tnum] text-expense">{formatCurrency(r.buy_price)}</div>
          </div>
          <div>
            <div className="text-text3 text-[10px] uppercase font-semibold mb-0.5">Harga Jual</div>
            <div className="font-bold font-[tnum] text-income">
              {hasSold ? (
                formatCurrency(r.sell_price)
              ) : (
                <span className="italic font-normal text-text3 text-[12px]">Belum terjual</span>
              )}
            </div>
          </div>
          <div className="col-span-2 pt-2 border-t border-border/30 flex justify-between items-center">
            <span className="text-text3 text-[11px] font-medium uppercase">Profit Estimasi</span>
            {hasSold ? (
              <span className={`font-bold text-[14px] font-[tnum] ${margin >= 0 ? 'text-income' : 'text-expense'}`}>
                {margin > 0 ? '+' : ''}
                {formatCurrency(margin)}
              </span>
            ) : (
              <span className="text-text3 font-medium">-</span>
            )}
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rekap Modal & Stok (V2)"
        subtitle="Lacak harga beli, harga jual, kuantitas inventaris, dan supplier pemasok"
        actions={
          isAuthorized && (
            <button
              type="button"
              onClick={() => {
                if (showForm) resetForm();
                else setShowForm(true);
              }}
              className="w-full sm:w-auto px-4 py-2 bg-textMain text-white rounded-md text-[13px] font-medium transition-colors hover:bg-[#333]"
            >
              {showForm ? 'Batal' : '+ Tambah Data'}
            </button>
          )
        }
      />

      {/* Filters */}
      <div className="bg-surface rounded-xl border border-border p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
          <h3 className="font-bold text-[14px] text-textMain uppercase tracking-[0.6px]">Penyaringan Inventaris V2</h3>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
              Cari Inventaris / Barang
            </label>
            <input
              type="text"
              placeholder="Nama barang, supplier, catatan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[13px] outline-none focus:border-textMain focus:bg-surface"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
              Filter Supplier
            </label>
            <select
              value={filterSupplierId}
              onChange={(e) => setFilterSupplierId(e.target.value)}
              className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[13px] outline-none focus:border-textMain focus:bg-surface"
            >
              <option value="all">📦 Semua Supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id.toString()}>
                  🏢 {s.name}
                </option>
              ))}
            </select>
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
              <option value="profit_desc">💰 Profit Tertinggi</option>
              <option value="profit_asc">💰 Profit Terendah</option>
              <option value="name_asc">🔤 Nama (A-Z)</option>
              <option value="name_desc">🔤 Nama (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Modal Dikeluarkan" value={stats.capital} variant="expense" />
        <StatCard title="Estimasi Pendapatan" value={stats.revenue} variant="income" />
        <StatCard title="Potensi Keuntungan (Profit)" value={stats.profit} variant="accent" isPrefixDynamic={true} />
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-surface rounded-xl border border-border p-5 shadow-sm transition-all duration-300"
        >
          <h3 className="font-semibold text-[14px] mb-4">
            {editingId ? 'Edit Data Inventaris (V2)' : 'Tambah Data Inventaris (V2)'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-[12px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
                Nama Barang/Modal
              </label>
              <input
                type="text"
                placeholder="Misal: Stok Sepatu, Bahan Baku..."
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[14px] outline-none focus:border-textMain focus:bg-surface"
                required
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
                Tanggal
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[14px] outline-none focus:border-textMain focus:bg-surface"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[12px] font-semibold text-text2 uppercase tracking-[0.4px]">
                  Harga Beli (Satuan)
                </label>
                <button
                  type="button"
                  onClick={() => setShowWeightCalc(!showWeightCalc)}
                  className="text-[11px] font-medium text-accent hover:underline focus:outline-none"
                >
                  {showWeightCalc ? '✕ Tutup Kalkulator' : '⚖️ Hitung dari Berat'}
                </button>
              </div>
              <input
                type="text"
                placeholder="0"
                value={buyPrice ? new Intl.NumberFormat('id-ID').format(Number(buyPrice)) : ''}
                onChange={(e) => {
                  const rawValue = e.target.value.replace(/\D/g, '');
                  setBuyPrice(rawValue ? Number.parseInt(rawValue, 10) : '');
                }}
                className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[14px] outline-none focus:border-textMain focus:bg-surface"
                required
              />

              {showWeightCalc && (
                <div className="mt-2.5 p-3 bg-surface2 border border-border rounded-lg space-y-2 animate-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-text3 uppercase mb-1">Berat (kg)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Misal: 5.5"
                        value={weight}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : '';
                          setWeight(val);
                          if (val && pricePerKg) {
                            setBuyPrice(Math.round(val * Number(pricePerKg)));
                          }
                        }}
                        className="w-full p-1.5 border border-border rounded bg-surface text-textMain text-[12px] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-text3 uppercase mb-1">Harga / kg</label>
                      <input
                        type="text"
                        placeholder="Misal: 20.000"
                        value={pricePerKg ? new Intl.NumberFormat('id-ID').format(Number(pricePerKg)) : ''}
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/\D/g, '');
                          const val = rawValue ? Number.parseInt(rawValue, 10) : '';
                          setPricePerKg(val);
                          if (weight && val) {
                            setBuyPrice(Math.round(Number(weight) * val));
                          }
                        }}
                        className="w-full p-1.5 border border-border rounded bg-surface text-textMain text-[12px] outline-none"
                      />
                    </div>
                  </div>
                  {weight && pricePerKg && (
                    <div className="text-[11.5px] text-income font-medium pt-1 flex justify-between items-center border-t border-dashed border-border/85">
                      <span>
                        Hasil: {weight} kg × {formatCurrency(Number(pricePerKg))}
                      </span>
                      <span className="font-bold">
                        {formatCurrency(Math.round(Number(weight) * Number(pricePerKg)))}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
                Kuantitas (Qty)
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[14px] outline-none focus:border-textMain focus:bg-surface"
                required
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
                Hubungkan Supplier
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[14.5px] outline-none focus:border-textMain focus:bg-surface"
              >
                <option value="">-- Tanpa Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id.toString()}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-[12px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
              Catatan Opsional
            </label>
            <input
              type="text"
              placeholder="Catatan tambahan (opsional)..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[14px] outline-none focus:border-textMain focus:bg-surface"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-textMain text-white rounded-lg text-[13px] font-medium hover:bg-[#333] disabled:opacity-50"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Data'}
            </button>
          </div>
        </form>
      )}

      <DataTable
        title="Daftar Inventaris V2"
        columns={columns}
        data={processedRecords}
        keyExtractor={(r) => r.id}
        loading={loading}
        emptyMessage="Belum ada catatan inventaris atau modal yang ditambahkan."
        emptyIcon="📦"
        mobileCard={mobileCard}
        pagination={true}
      />
    </div>
  );
}
