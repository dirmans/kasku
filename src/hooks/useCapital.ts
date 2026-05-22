import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { CapitalRecord, Session } from '../types';

export function useCapital(session: Session | null) {
  const [records, setRecords] = useState<CapitalRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchRecords = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('capital_records')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords((data as CapitalRecord[]) || []);
      return data;
    } catch (err) {
      console.error('Error fetching capital records:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session]);

  const addRecord = async (payload: Partial<CapitalRecord>) => {
    const { data, error } = await supabase.from('capital_records').insert({ ...payload, user_id: session?.user?.id });
    if (error) throw error;
    return data;
  };

  const updateRecord = async (id: number, payload: Partial<CapitalRecord>) => {
    const { data, error } = await supabase.from('capital_records').update(payload).eq('id', id);
    if (error) throw error;
    return data;
  };

  const deleteRecord = async (id: number) => {
    const { data, error } = await supabase.from('capital_records').delete().eq('id', id);
    if (error) throw error;
    return data;
  };

  const deleteAllRecords = async () => {
    const { error } = await supabase.from('capital_records').delete().neq('id', 0);
    if (error) throw error;
  };

  return {
    records,
    loading,
    fetchRecords,
    addRecord,
    updateRecord,
    deleteRecord,
    deleteAllRecords,
  };
}
