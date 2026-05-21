import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

export default function CapitalTab({ session }) {
  const isAuthorized = true;
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [itemName, setItemName] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRecords = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('capital_records')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error('Error fetching capital records:', err.message);
      // alert('Gagal mengambil data rekap modal: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [session]);

  const resetForm = () => {
    setEditingId(null);
    setItemName('');
    setBuyPrice('');
    setSellPrice('');
    setQuantity(1);
    setDate(new Date().toISOString().split('T')[0]);
    setNote('');
    setShowForm(false);
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    setItemName(record.item_name);
    setBuyPrice(record.buy_price);
    setSellPrice(record.sell_price);
    setQuantity(record.quantity);
    setDate(record.date);
    setNote(record.note || '');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!session?.user?.id) return alert('Sesi tidak valid.');
    if (!itemName.trim()) return alert('Nama barang harus diisi');
    
    setSubmitting(true);
    try {
      const payload = {
        user_id: session.user.id,
        item_name: itemName.trim(),
        buy_price: Number(buyPrice) || 0,
        sell_price: Number(sellPrice) || 0,
        quantity: Number(quantity) || 1,
        date,
        note: note.trim()
      };

      let error;
      if (editingId) {
        ({ error } = await supabase.from('capital_records').update(payload).eq('id', editingId));
      } else {
        ({ error } = await supabase.from('capital_records').insert(payload));
      }

      if (error) throw error;

      alert(editingId ? 'Data berhasil diperbarui!' : 'Data berhasil ditambahkan!');
      resetForm();
      fetchRecords();
    } catch (err) {
      console.error('Error saving record:', err);
      alert('Gagal menyimpan data: pastikan tabel capital_records sudah dibuat di database Anda.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan ini?')) return;
    try {
      const { error } = await supabase
        .from('capital_records')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchRecords();
    } catch (err) {
      alert('Gagal menghapus catatan: ' + err.message);
    }
  };

  // Utilities
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  const formatDate = (dateStr) => {
    try {
      const options = { day: 'numeric', month: 'short', year: 'numeric' };
      return new Date(dateStr).toLocaleDateString('id-ID', options);
    } catch (e) {
      return dateStr;
    }
  };

  // Stats
  const stats = useMemo(() => {
    let totalCapital = 0;
    let totalRevenue = 0;
    records.forEach(r => {
      totalCapital += Number(r.buy_price) * Number(r.quantity);
      totalRevenue += Number(r.sell_price) * Number(r.quantity);
    });
    return {
      capital: totalCapital,
      revenue: totalRevenue,
      profit: totalRevenue - totalCapital
    };
  }, [records]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold text-textMain">Rekap Modal & Stok</h2>
          <p className="text-[12px] text-text3 mt-0.5">Lacak harga beli, harga jual, dan kuantitas inventaris</p>
        </div>
        {isAuthorized && (
          <button
            onClick={() => {
              if (showForm) resetForm();
              else setShowForm(true);
            }}
            className="px-4 py-2 bg-textMain text-white rounded-md text-[13px] font-medium transition-colors hover:bg-[#333]"
          >
            {showForm ? 'Batal' : '+ Tambah Data'}
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface rounded-xl border border-border p-4 shadow-sm relative overflow-hidden border-t-[3px] border-t-expense">
          <div className="text-[10px] text-text3 uppercase tracking-[0.6px] font-semibold mb-1">Total Modal Dikeluarkan</div>
          <div className="text-[18px] font-bold text-expense font-[tnum]">{formatCurrency(stats.capital)}</div>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 shadow-sm relative overflow-hidden border-t-[3px] border-t-income">
          <div className="text-[10px] text-text3 uppercase tracking-[0.6px] font-semibold mb-1">Estimasi Pendapatan</div>
          <div className="text-[18px] font-bold text-income font-[tnum]">{formatCurrency(stats.revenue)}</div>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 shadow-sm relative overflow-hidden border-t-[3px] border-t-accent">
          <div className="text-[10px] text-text3 uppercase tracking-[0.6px] font-semibold mb-1">Potensi Keuntungan (Profit)</div>
          <div className={`text-[18px] font-bold font-[tnum] ${stats.profit >= 0 ? 'text-income' : 'text-expense'}`}>
            {stats.profit < 0 ? '-' : '+'} {formatCurrency(Math.abs(stats.profit))}
          </div>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-5 shadow-sm transition-all duration-300">
          <h3 className="font-semibold text-[14px] mb-4">{editingId ? 'Edit Data Inventaris' : 'Tambah Data Inventaris'}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[12px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">Nama Barang/Modal</label>
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
              <label className="block text-[12px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">Tanggal</label>
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
              <label className="block text-[12px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">Harga Beli (Satuan)</label>
              <input
                type="text"
                placeholder="0"
                value={buyPrice ? new Intl.NumberFormat('id-ID').format(buyPrice) : ''}
                onChange={(e) => {
                  const rawValue = e.target.value.replace(/\D/g, '');
                  setBuyPrice(rawValue ? parseInt(rawValue, 10) : '');
                }}
                className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[14px] outline-none focus:border-textMain focus:bg-surface"
                required
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">Harga Jual (Satuan)</label>
              <input
                type="text"
                placeholder="0"
                value={sellPrice ? new Intl.NumberFormat('id-ID').format(sellPrice) : ''}
                onChange={(e) => {
                  const rawValue = e.target.value.replace(/\D/g, '');
                  setSellPrice(rawValue ? parseInt(rawValue, 10) : '');
                }}
                className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[14px] outline-none focus:border-textMain focus:bg-surface"
                required
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">Kuantitas (Qty)</label>
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[14px] outline-none focus:border-textMain focus:bg-surface"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-[12px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">Catatan Opsional</label>
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

      {/* Table */}
      <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
        <h3 className="font-bold text-[14px] text-textMain uppercase tracking-[0.6px] mb-4">Daftar Inventaris</h3>
        
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-6 h-6 border-2 border-border border-t-textMain rounded-full animate-spin"></div>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-text3 text-[13.5px]">
            Belum ada catatan inventaris atau modal yang ditambahkan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] text-left">
              <thead>
                <tr className="text-text3 font-semibold uppercase tracking-[0.4px] text-[11px] border-b border-border">
                  <th className="pb-3 pt-1">Tanggal</th>
                  <th className="pb-3 pt-1">Barang/Modal</th>
                  <th className="pb-3 pt-1 text-center">Qty</th>
                  <th className="pb-3 pt-1 text-right">Harga Beli</th>
                  <th className="pb-3 pt-1 text-right">Harga Jual</th>
                  <th className="pb-3 pt-1 text-right">Profit Estimasi</th>
                  {isAuthorized && <th className="pb-3 pt-1 text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {records.map(r => {
                  const modal = Number(r.buy_price) * Number(r.quantity);
                  const omset = Number(r.sell_price) * Number(r.quantity);
                  const margin = omset - modal;

                  return (
                    <tr key={r.id} className="hover:bg-surface2/40 transition-colors">
                      <td className="py-3.5 text-text2 font-medium">{formatDate(r.date)}</td>
                      <td className="py-3.5 font-semibold text-textMain">
                        {r.item_name}
                        {r.note && (
                          <div className="text-[10.5px] font-normal text-text3 mt-0.5">{r.note}</div>
                        )}
                      </td>
                      <td className="py-3.5 text-center font-[tnum] font-medium">{r.quantity}</td>
                      <td className="py-3.5 text-right font-[tnum] text-expense">{formatCurrency(r.buy_price)}</td>
                      <td className="py-3.5 text-right font-[tnum] text-income">{formatCurrency(r.sell_price)}</td>
                      <td className={`py-3.5 text-right font-bold font-[tnum] ${margin >= 0 ? 'text-income' : 'text-expense'}`}>
                        {margin > 0 ? '+' : ''}{formatCurrency(margin)}
                      </td>
                      {isAuthorized && (
                        <td className="py-3.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(r)}
                              className="p-1.5 rounded border border-border text-text3 hover:text-textMain hover:bg-surface2 transition-all"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(r.id)}
                              className="p-1.5 rounded border border-border text-text3 hover:text-expense hover:bg-expenseBg hover:border-[#f1c4c4] transition-all"
                              title="Hapus"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
