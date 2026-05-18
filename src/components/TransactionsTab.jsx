import { useState } from 'react';

export default function TransactionsTab({ 
  transactions, 
  categories, 
  loading, 
  onEdit, 
  onDelete,
  session
}) {
  const isLocal = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isAuthorized = isLocal;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Formatting utilities
  const formatDate = (dateStr) => {
    try {
      const options = { day: 'numeric', month: 'short', year: 'numeric' };
      return new Date(dateStr).toLocaleDateString('id-ID', options);
    } catch (e) {
      return dateStr;
    }
  };

  const getCategoryEmoji = (type, catName) => {
    const found = categories.find(c => c.name === catName && c.type === type);
    return found ? found.emoji : '📦';
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedType('all');
    setStartDate('');
    setEndDate('');
    setSortBy('date_desc');
    setCurrentPage(1);
  };

  // Filter & Sort Logic
  const filteredTransactions = transactions.filter(t => {
    // 1. Search term (description & note)
    const matchesSearch = 
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.note && t.note.toLowerCase().includes(searchTerm.toLowerCase()));

    // 2. Category
    const matchesCategory = selectedCategory ? t.category === selectedCategory : true;

    // 3. Type
    const matchesType = selectedType === 'all' ? true : t.type === selectedType;

    // 4. Date Range
    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && t.date >= startDate;
    }
    if (endDate) {
      matchesDate = matchesDate && t.date <= endDate;
    }

    return matchesSearch && matchesCategory && matchesType && matchesDate;
  });

  // Sort
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortBy === 'date_desc') {
      return new Date(b.date) - new Date(a.date) || b.id.localeCompare(a.id);
    }
    if (sortBy === 'date_asc') {
      return new Date(a.date) - new Date(b.date) || a.id.localeCompare(b.id);
    }
    if (sortBy === 'amount_desc') {
      return Number(b.amount) - Number(a.amount);
    }
    if (sortBy === 'amount_asc') {
      return Number(a.amount) - Number(b.amount);
    }
    return 0;
  });

  // Pagination Logic
  const totalItems = sortedTransactions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedTransactions.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters Card */}
      <div className="bg-surface rounded-xl border border-border p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-[14px] text-textMain uppercase tracking-[0.6px]">Penyaringan Transaksi</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search Box */}
          <div>
            <label className="block text-[11px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">Cari Deskripsi/Catatan</label>
            <input 
              type="text"
              placeholder="Cari kata kunci..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[13px] outline-none focus:border-textMain focus:bg-surface"
            />
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">Jenis Transaksi</label>
            <select
              value={selectedType}
              onChange={(e) => { setSelectedType(e.target.value); setCurrentPage(1); }}
              className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[13px] outline-none focus:border-textMain focus:bg-surface"
            >
              <option value="all">Semua Jenis</option>
              <option value="pemasukan">📈 Pemasukan</option>
              <option value="pengeluaran">📉 Pengeluaran</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">Kategori</label>
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
              className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[13px] outline-none focus:border-textMain focus:bg-surface"
            >
              <option value="">Semua Kategori</option>
              {/* Unique categories */}
              {Array.from(new Set(categories.map(c => c.name))).map(catName => {
                const catObj = categories.find(c => c.name === catName);
                return (
                  <option key={catObj.id} value={catName}>
                    {catObj.emoji || '📑'} {catName}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">Tanggal Mulai</label>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[13px] outline-none focus:border-textMain focus:bg-surface"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">Tanggal Akhir</label>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[13px] outline-none focus:border-textMain focus:bg-surface"
            />
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[11px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">Urutkan</label>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
              className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[13px] outline-none focus:border-textMain focus:bg-surface"
            >
              <option value="date_desc">📅 Tanggal Terbaru</option>
              <option value="date_asc">📅 Tanggal Terlama</option>
              <option value="amount_desc">💰 Jumlah Tertinggi</option>
              <option value="amount_asc">💰 Jumlah Terendah</option>
            </select>
          </div>

          {/* Reset Button */}
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

      {/* Transactions List */}
      <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[14px] text-textMain uppercase tracking-[0.6px]">Riwayat Transaksi ({totalItems})</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-6 h-6 border-2 border-border border-t-textMain rounded-full animate-spin"></div>
          </div>
        ) : currentItems.length === 0 ? (
          <div className="p-12 text-center text-text3 text-[13.5px]">
            Tidak ada transaksi ditemukan yang cocok dengan kriteria filter Anda.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] text-left">
                <thead>
                  <tr className="text-text3 font-semibold uppercase tracking-[0.4px] text-[11px] border-b border-border">
                    <th className="pb-3 pt-1">Tanggal</th>
                    <th className="pb-3 pt-1">Keterangan</th>
                    <th className="pb-3 pt-1">Kategori</th>
                    <th className="pb-3 pt-1">Tipe</th>
                    <th className="pb-3 pt-1 text-right">Jumlah</th>
                    {isAuthorized && <th className="pb-3 pt-1 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {currentItems.map(t => (
                    <tr key={t.id} className="hover:bg-surface2/40 transition-colors">
                      <td className="py-3.5 text-text2 font-medium">{formatDate(t.date)}</td>
                      <td className="py-3.5 font-semibold text-textMain">
                        {t.description}
                        {t.note && (
                          <div className="text-[10.5px] font-normal text-text3 mt-0.5">{t.note}</div>
                        )}
                      </td>
                      <td className="py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-surface2 rounded-full border border-border text-[11.5px] text-textMain font-medium">
                          <span>{getCategoryEmoji(t.type, t.category)}</span>
                          <span>{t.category}</span>
                        </span>
                      </td>
                      <td className="py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          t.type === 'pemasukan' 
                            ? 'bg-incomeBg border-[#d0f5e1] text-income' 
                            : 'bg-expenseBg border-[#fbe3e3] text-expense'
                        }`}>
                          {t.type === 'pemasukan' ? '↑ Pemasukan' : '↓ Pengeluaran'}
                        </span>
                      </td>
                      <td className={`py-3.5 text-right font-bold font-[tnum] text-[14px] ${
                        t.type === 'pemasukan' ? 'text-income' : 'text-expense'
                      }`}>
                        {t.type === 'pemasukan' ? '+' : '-'} {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(t.amount)}
                      </td>
                      {isAuthorized && (
                        <td className="py-3.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => onEdit(t)}
                              className="p-1.5 rounded border border-border text-text3 hover:text-textMain hover:bg-surface2 transition-all"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => onDelete(t.id)}
                              className="p-1.5 rounded border border-border text-text3 hover:text-expense hover:bg-expenseBg hover:border-[#f1c4c4] transition-all"
                              title="Hapus"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border pt-4 text-[12.5px] text-text2">
                <div>
                  Menampilkan <span className="font-semibold text-textMain">{indexOfFirstItem + 1}</span> sampai{' '}
                  <span className="font-semibold text-textMain">{Math.min(indexOfLastItem, totalItems)}</span> dari{' '}
                  <span className="font-semibold text-textMain">{totalItems}</span> transaksi
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 border border-border rounded-lg bg-surface hover:bg-surface2 disabled:opacity-40 transition-colors"
                  >
                    ◀️ Sebelumnya
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                    <button
                      key={num}
                      onClick={() => handlePageChange(num)}
                      className={`w-8 h-8 rounded-lg border font-medium transition-colors ${
                        currentPage === num
                          ? 'bg-textMain border-textMain text-white'
                          : 'border-border bg-surface text-textMain hover:bg-surface2'
                      }`}
                    >
                      {num}
                    </button>
                  ))}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-border rounded-lg bg-surface hover:bg-surface2 disabled:opacity-40 transition-colors"
                  >
                    Selanjutnya ▶️
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
