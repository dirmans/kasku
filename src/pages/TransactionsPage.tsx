import { useState } from 'react';
import TransactionTable from '../components/templates/TransactionTable';
import type { Category, Session, Transaction } from '../types';

interface TransactionsTabProps {
  transactions: Transaction[];
  categories: Category[];
  loading: boolean;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: number) => void;
  session: Session | null;
}

export default function TransactionsTab({ transactions, categories, loading, onEdit, onDelete }: TransactionsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('all');
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
    setStartDate('');
    setEndDate('');
    setSortBy('date_desc');
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.note?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory ? t.category === selectedCategory : true;
    const matchesType = selectedType === 'all' ? true : t.type === selectedType;

    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && t.date >= startDate;
    }
    if (endDate) {
      matchesDate = matchesDate && t.date <= endDate;
    }

    return matchesSearch && matchesCategory && matchesType && matchesDate;
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

  return (
    <div className="space-y-6">
      {/* Filters Card */}
      <div className="bg-surface rounded-xl border border-border p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-[14px] text-textMain uppercase tracking-[0.6px]">Penyaringan Transaksi</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        onEdit={onEdit}
        onDelete={onDelete}
        loading={loading}
        pagination={true}
        pageSize={10}
        getCategoryEmoji={getCategoryEmoji}
      />
    </div>
  );
}
