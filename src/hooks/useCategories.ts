import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Category, Session } from '../types';

export function useCategories(session: Session | null) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchCategories = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      let { data, error } = await supabase.from('categories').select('*').order('name');

      if (error) throw error;

      if (!data || data.length === 0) {
        const defaultCats = [
          { name: 'Modal Awal', type: 'pemasukan', emoji: '💰' },
          { name: 'Pembayaran pelanggan', type: 'pemasukan', emoji: '🤝' },
          { name: 'Lainnya', type: 'pemasukan', emoji: '📦' },
          { name: 'Biaya Kandang', type: 'pengeluaran', emoji: '🏠' },
          { name: 'UM Pegawai', type: 'pengeluaran', emoji: '💵' },
          { name: 'Gaji Pegawai', type: 'pengeluaran', emoji: '💼' },
          { name: 'Rumput', type: 'pengeluaran', emoji: '🌱' },
          { name: 'Obat-obatan', type: 'pengeluaran', emoji: '💊' },
          { name: 'Biaya Transportasi', type: 'pengeluaran', emoji: '🚗' },
          { name: 'Setoran Modal', type: 'pengeluaran', emoji: '🪙' },
          { name: 'Lainnya', type: 'pengeluaran', emoji: '📦' },
        ];

        const { error: seedErr } = await supabase
          .from('categories')
          .insert(defaultCats.map((c) => ({ ...c, user_id: session.user.id })));
        if (seedErr) throw seedErr;

        // Refetch after seeding
        const { data: newData, error: newError } = await supabase.from('categories').select('*').order('name');
        if (newError) throw newError;
        data = newData;
      }

      setCategories((data as Category[]) || []);
      return data;
    } catch (err) {
      console.error('Error fetching categories:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session]);

  const addCategory = async (payload: Partial<Category>) => {
    const { data, error } = await supabase.from('categories').insert({ ...payload, user_id: session?.user?.id });
    if (error) throw error;
    return data;
  };

  const deleteCategory = async (id: number) => {
    const { data, error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    return data;
  };

  const deleteAllCategories = async () => {
    if (!session?.user?.id) return;
    const { error: catErr } = await supabase.from('categories').delete().neq('id', 0); // Delete all
    if (catErr) throw catErr;

    // Reseed default categories
    const defaultCats = [
      { name: 'Modal Awal', type: 'pemasukan', emoji: '💰' },
      { name: 'Pembayaran pelanggan', type: 'pemasukan', emoji: '🤝' },
      { name: 'Lainnya', type: 'pemasukan', emoji: '📦' },
      { name: 'Biaya Kandang', type: 'pengeluaran', emoji: '🏠' },
      { name: 'UM Pegawai', type: 'pengeluaran', emoji: '💵' },
      { name: 'Gaji Pegawai', type: 'pengeluaran', emoji: '💼' },
      { name: 'Rumput', type: 'pengeluaran', emoji: '🌱' },
      { name: 'Obat-obatan', type: 'pengeluaran', emoji: '💊' },
      { name: 'Biaya Transportasi', type: 'pengeluaran', emoji: '🚗' },
      { name: 'Setoran Modal', type: 'pengeluaran', emoji: '🪙' },
      { name: 'Lainnya', type: 'pengeluaran', emoji: '📦' },
    ];

    const { error: seedErr } = await supabase
      .from('categories')
      .insert(defaultCats.map((c) => ({ ...c, user_id: session.user.id })));
    if (seedErr) throw seedErr;
  };

  return {
    categories,
    loading,
    fetchCategories,
    addCategory,
    deleteCategory,
    deleteAllCategories,
  };
}
