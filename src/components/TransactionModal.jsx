import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function TransactionModal({ isOpen, onClose, transaction, session, onSuccess }) {
  const [type, setType] = useState('pengeluaran'); // 'pemasukan' or 'pengeluaran'
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);

  // Fetch categories from Supabase
  useEffect(() => {
    const fetchCategories = async () => {
      if (!session?.user?.id) return;
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('user_id', session.user.id)
          .order('name');
        
        if (error) throw error;
        setCategories(data || []);
      } catch (err) {
        console.error('Error fetching categories in modal:', err.message);
      }
    };

    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen, session]);

  useEffect(() => {
    if (transaction) {
      setType(transaction.type || 'pengeluaran');
      setAmount(transaction.amount || '');
      setDate(transaction.date || '');
      setDescription(transaction.description || '');
      setCategory(transaction.category || '');
    } else {
      setType('pengeluaran');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setCategory('');
    }
  }, [transaction, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || amount <= 0) return alert('Jumlah harus diisi');
    
    setLoading(true);
    try {
      const payload = {
        user_id: session.user.id,
        type,
        amount: Number(amount),
        date,
        description: description.trim(),
        category,
        method: 'tunai', // Default fallback matching Indonesian DB schema
        note: ''
      };

      let error;
      if (transaction) {
        ({ error } = await supabase.from('transactions').update(payload).eq('id', transaction.id));
      } else {
        ({ error } = await supabase.from('transactions').insert(payload));
      }

      if (error) throw error;
      
      alert('Transaksi berhasil disimpan!');
      if (onSuccess) onSuccess();
      else onClose();
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter categories by selected transaction type (pemasukan/pengeluaran)
  const filteredCategories = categories.filter(c => c.type === type);

  return (
    <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-xl w-[480px] max-w-[95vw] shadow-[0_20px_60px_rgba(0,0,0,0.2)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-[18px_22px] border-b border-border flex items-center justify-between">
          <div className="text-[15px] font-semibold">{transaction ? 'Edit Transaksi' : 'Tambah Transaksi'}</div>
          <button 
            onClick={onClose}
            className="w-[26px] h-[26px] rounded-md border border-border bg-transparent cursor-pointer flex items-center justify-center text-[14px] text-text2 transition-colors hover:bg-surface2"
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-[20px_22px]">
            <div className="mb-[14px]">
              <label className="block text-[12px] font-semibold text-text2 mb-[6px] uppercase tracking-[0.4px]">Jenis Transaksi</label>
              <div className="grid grid-cols-2 gap-2">
                <div 
                  className={`p-2.5 rounded-lg border-2 cursor-pointer text-center text-[13px] font-medium transition-all ${type === 'pemasukan' ? 'bg-incomeBg border-income text-income' : 'border-border'}`}
                  onClick={() => {
                    setType('pemasukan');
                    setCategory(''); // reset category on type switch
                  }}
                >
                  📈 Pemasukan
                </div>
                <div 
                  className={`p-2.5 rounded-lg border-2 cursor-pointer text-center text-[13px] font-medium transition-all ${type === 'pengeluaran' ? 'bg-expenseBg border-expense text-expense' : 'border-border'}`}
                  onClick={() => {
                    setType('pengeluaran');
                    setCategory(''); // reset category on type switch
                  }}
                >
                  📉 Pengeluaran
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-[14px]">
              <div>
                <label className="block text-[12px] font-semibold text-text2 mb-[6px] uppercase tracking-[0.4px]">Jumlah (Rp)</label>
                <input 
                  type="text" 
                  className="w-full p-[10px_14px] border border-border rounded-lg bg-surface2 text-textMain text-[14px] outline-none transition-colors focus:border-textMain focus:bg-surface"
                  placeholder="0" 
                  value={amount ? new Intl.NumberFormat('id-ID').format(amount) : ''}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\D/g, '');
                    setAmount(rawValue ? parseInt(rawValue, 10) : '');
                  }}
                  required
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-text2 mb-[6px] uppercase tracking-[0.4px]">Tanggal</label>
                <input 
                  type="date" 
                  className="w-full p-[10px_14px] border border-border rounded-lg bg-surface2 text-textMain text-[14px] outline-none transition-colors focus:border-textMain focus:bg-surface"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mb-[14px]">
              <label className="block text-[12px] font-semibold text-text2 mb-[6px] uppercase tracking-[0.4px]">Keterangan</label>
              <input 
                type="text" 
                className="w-full p-[10px_14px] border border-border rounded-lg bg-surface2 text-textMain text-[14px] outline-none transition-colors focus:border-textMain focus:bg-surface"
                placeholder="Deskripsi transaksi..." 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-text2 mb-[6px] uppercase tracking-[0.4px]">Kategori</label>
              <select 
                className="w-full p-[10px_14px] border border-border rounded-lg bg-surface2 text-textMain text-[14px] outline-none transition-colors focus:border-textMain focus:bg-surface"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="">Pilih kategori...</option>
                {filteredCategories.map(cat => (
                  <option key={cat.id} value={cat.name}>
                    {cat.emoji || '📑'} {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-[14px_22px] border-t border-border flex justify-end gap-2 bg-surface2">
            <button 
              type="button"
              onClick={onClose}
              className="px-[18px] py-[10px] rounded-lg border border-border bg-surface text-textMain text-[13px] font-medium transition-colors hover:bg-surface2"
            >
              Batal
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="px-[18px] py-[10px] rounded-lg border border-textMain bg-textMain text-white text-[13px] font-medium transition-colors hover:bg-[#333] disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
