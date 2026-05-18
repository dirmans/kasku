import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const POPULAR_EMOJIS = [
  '🍔', '🚗', '🛍️', '🏠', '🔌', '🏥', '🎓', '✈️', '🎮', '🍿', 
  '💼', '🎁', '🛒', '☕', '💅', '🏋️', '📚', '🐱',
  '💰', '💵', '💳', '📊', '🏦', '🪙', '💎', '📈', '🚀', '🤝'
];

export default function CategoriesTab({ session }) {
  const isAuthorized = import.meta.env.DEV || session?.user?.email === 'kwokkwon@gmail.com';
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('pengeluaran'); // 'pemasukan' or 'pengeluaran'
  
  // Form State
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🍔');
  const [formType, setFormType] = useState('pengeluaran');
  const [submitting, setSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchCategories = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err.message);
      alert('Gagal mengambil data kategori: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [session]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!session?.user?.id) {
      alert('Sesi tidak valid. Silakan masuk kembali.');
      return;
    }
    if (!name.trim()) return alert('Nama kategori harus diisi');

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('categories')
        .insert({
          user_id: session.user.id,
          name: name.trim(),
          type: formType,
          emoji
        });

      if (error) throw error;

      alert('Kategori berhasil ditambahkan!');
      setName('');
      setShowAddForm(false);
      fetchCategories();
    } catch (err) {
      console.error('Error adding category:', err);
      alert('Gagal menambahkan kategori: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus kategori ini?')) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Kategori berhasil dihapus!');
      fetchCategories();
    } catch (err) {
      alert('Gagal menghapus kategori: ' + err.message);
    }
  };

  const filteredCategories = categories.filter(c => c.type === activeType);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold text-textMain">Kelola Kategori</h2>
          <p className="text-[12px] text-text3 mt-0.5">Atur kategori pemasukan dan pengeluaran Anda</p>
        </div>
        {isAuthorized && (
          <button
            onClick={() => {
              setFormType(activeType);
              setShowAddForm(!showAddForm);
            }}
            className="px-4 py-2 bg-textMain text-white rounded-md text-[13px] font-medium transition-colors hover:bg-[#333]"
          >
            {showAddForm ? 'Batal' : '+ Kategori Baru'}
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-5 shadow-sm max-w-xl transition-all duration-300">
          <h3 className="font-semibold text-[14px] mb-4">Tambah Kategori Baru</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[12px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">Tipe</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormType('pemasukan')}
                  className={`p-2 rounded-lg border text-[13px] font-medium transition-all ${formType === 'pemasukan' ? 'bg-incomeBg border-income text-income' : 'border-border bg-transparent text-text2'}`}
                >
                  📈 Pemasukan
                </button>
                <button
                  type="button"
                  onClick={() => setFormType('pengeluaran')}
                  className={`p-2 rounded-lg border text-[13px] font-medium transition-all ${formType === 'pengeluaran' ? 'bg-expenseBg border-expense text-expense' : 'border-border bg-transparent text-text2'}`}
                >
                  📉 Pengeluaran
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">Nama Kategori</label>
              <input
                type="text"
                placeholder="Misal: Makanan, Investasi..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[14px] outline-none focus:border-textMain focus:bg-surface"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-[12px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">Pilih Emoji ({emoji})</label>
            <div className="flex flex-wrap gap-2 p-3 bg-surface2 rounded-lg max-h-[120px] overflow-y-auto border border-border">
              {POPULAR_EMOJIS.map(em => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setEmoji(em)}
                  className={`w-8 h-8 flex items-center justify-center rounded text-[18px] hover:bg-surface transition-all ${emoji === em ? 'bg-surface border-2 border-textMain scale-110 shadow-sm' : ''}`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-border rounded-lg bg-transparent text-text2 text-[13px] hover:bg-surface2"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-textMain text-white rounded-lg text-[13px] font-medium hover:bg-[#333] disabled:opacity-50"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Kategori'}
            </button>
          </div>
        </form>
      )}

      {/* Tabs list */}
      <div className="flex border-b border-border gap-4">
        <button
          onClick={() => setActiveType('pengeluaran')}
          className={`pb-2.5 px-1 text-[14px] font-semibold transition-all relative ${activeType === 'pengeluaran' ? 'text-expense' : 'text-text3 hover:text-text2'}`}
        >
          📉 Pengeluaran
          {activeType === 'pengeluaran' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-expense rounded" />}
        </button>
        <button
          onClick={() => setActiveType('pemasukan')}
          className={`pb-2.5 px-1 text-[14px] font-semibold transition-all relative ${activeType === 'pemasukan' ? 'text-income' : 'text-text3 hover:text-text2'}`}
        >
          📈 Pemasukan
          {activeType === 'pemasukan' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-income rounded" />}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-6 h-6 border-2 border-border border-t-textMain rounded-full animate-spin"></div>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-12 text-center text-text3">
          Belum ada kategori untuk tipe ini. Silakan tambahkan baru!
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {filteredCategories.map(cat => (
            <div key={cat.id} className="bg-surface rounded-xl border border-border p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-surface2 text-[20px]">
                  {cat.emoji || '📑'}
                </div>
                <div>
                  <h4 className="font-semibold text-[13.5px] text-textMain">{cat.name}</h4>
                  <p className="text-[10px] text-text3 uppercase tracking-[0.4px]">{cat.type}</p>
                </div>
              </div>
              {isAuthorized && (
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="w-7 h-7 rounded border border-border flex items-center justify-center text-text3 hover:text-expense hover:border-[#f1c4c4] hover:bg-expenseBg transition-all"
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
