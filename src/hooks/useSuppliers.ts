import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, Supplier } from '../types';

export function useSuppliers(session: Session | null) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchSuppliers = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('suppliers').select('*').order('name', { ascending: true });

      if (error) throw error;
      setSuppliers((data as Supplier[]) || []);
      return data;
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session]);

  const addSupplier = async (payload: Partial<Supplier>) => {
    const { data, error } = await supabase
      .from('suppliers')
      .insert({ ...payload, user_id: session?.user?.id })
      .select();
    if (error) throw error;
    return data;
  };

  const updateSupplier = async (id: number, payload: Partial<Supplier>) => {
    const { data, error } = await supabase.from('suppliers').update(payload).eq('id', id).select();
    if (error) throw error;
    return data;
  };

  const deleteSupplier = async (id: number) => {
    const { data, error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) throw error;
    return data;
  };

  return {
    suppliers,
    loading,
    fetchSuppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
  };
}
