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
  };

  const handleEdit = (record: CapitalRecord) => {
    setEditingId(record.id);
    setItemName(record.item_name);
    setBuyPrice(record.buy_price);
    setQuantity(record.quantity);
    setDate(record.date);
    setNote(record.note || '');
    setSupplierId(record.supplier_id ? record.supplier_id.toString() : '');
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
      <div className="bg-surface rounded-xl border border-border p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <label className="block text-[12px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
                Harga Beli (Satuan)
              </label>
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
      />
    </div>
  );
}
