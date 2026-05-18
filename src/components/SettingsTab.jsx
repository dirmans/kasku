import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function SettingsTab({ session, onReset }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const isAuthorized = import.meta.env.DEV || session?.user?.email === 'kwokkwon@gmail.com';

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!password) return alert('Kata sandi tidak boleh kosong');
    if (password.length < 6) return alert('Kata sandi harus minimal 6 karakter');
    if (password !== confirmPassword) return alert('Kata sandi tidak cocok');

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      alert('Kata sandi berhasil diperbarui!');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      alert('Gagal memperbarui kata sandi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetData = async () => {
    const doubleCheck = confirm(
      '⚠️ PERINGATAN KRITIS: Tindakan ini akan menghapus SELURUH transaksi dan kategori kustom Anda secara permanen dari server.\n\nApakah Anda yakin ingin melanjutkan reset total?'
    );
    if (!doubleCheck) return;

    const finalCheck = confirm(
      'Konfirmasi Terakhir: Data Anda tidak dapat dikembalikan setelah proses ini selesai. Ketik "OK" jika Anda benar-benar yakin.'
    );
    if (!finalCheck) return;

    setResetLoading(true);
    try {
      // 1. Delete all transactions
      const { error: txErr } = await supabase
        .from('transactions')
        .delete();
      
      if (txErr) throw txErr;

      // 2. Delete all categories
      const { error: catErr } = await supabase
        .from('categories')
        .delete();
      
      if (catErr) throw catErr;

      // 3. Call RPC to re-seed default categories
      const { error: seedErr } = await supabase.rpc('seed_default_categories', {
        p_user_id: session.user.id
      });

      if (seedErr) throw seedErr;

      alert('Seluruh data berhasil dihapus dan kategori default telah disemai ulang!');
      if (onReset) onReset();
    } catch (err) {
      alert('Gagal melakukan reset data: ' + err.message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Card */}
      <div className="bg-surface rounded-xl border border-border p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-[14px] text-textMain uppercase tracking-[0.6px]">Profil Pengguna</h3>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-surface2 border border-border flex items-center justify-center text-[22px]">
            👤
          </div>
          <div>
            <div className="text-[13px] font-semibold text-textMain">{session?.user?.email}</div>
            <div className="text-[11px] text-text3 mt-0.5">Akun Aktif KasKu</div>
          </div>
        </div>
      </div>

      {/* Security Form */}
      <div className="bg-surface rounded-xl border border-border p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-[14px] text-textMain uppercase tracking-[0.6px]">Ubah Kata Sandi</h3>
        
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">Kata Sandi Baru</label>
              <input 
                type="password"
                placeholder="Minimal 6 karakter..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[13px] outline-none focus:border-textMain focus:bg-surface"
                required
              />
            </div>
            
            <div>
              <label className="block text-[11px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">Konfirmasi Kata Sandi</label>
              <input 
                type="password"
                placeholder="Ulangi kata sandi..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[13px] outline-none focus:border-textMain focus:bg-surface"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-textMain text-white rounded-lg text-[13px] font-medium transition-colors hover:bg-[#333] disabled:opacity-40"
          >
            {loading ? 'Menyimpan...' : 'Perbarui Kata Sandi'}
          </button>
        </form>
      </div>

      {/* Data Management Warning */}
      {isAuthorized && (
        <div className="bg-surface rounded-xl border border-red-200 p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-[14px] text-red-600 uppercase tracking-[0.6px]">⚠️ Zona Bahaya</h3>
          <p className="text-[12.5px] text-text3">
            Jika Anda mengalami masalah dengan database Anda atau ingin memulai dari awal lagi, Anda dapat melakukan reset total di bawah ini. Tindakan ini akan menghapus semua transaksi dan kategori Anda selamanya.
          </p>

          <div>
            <button
              onClick={handleResetData}
              disabled={resetLoading}
              className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-[13px] font-medium transition-colors hover:bg-red-50 disabled:opacity-40"
            >
              {resetLoading ? 'Memproses Reset...' : 'Hapus & Reset Semua Data'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
