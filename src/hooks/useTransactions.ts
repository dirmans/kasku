import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, Transaction } from '../types';

export function useTransactions(session: Session | null) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchTransactions = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions((data as Transaction[]) || []);
      return data;
    } catch (err) {
      console.error('Error fetching transactions:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session]);

  const addTransaction = async (payload: Partial<Transaction>) => {
    const { data, error } = await supabase.from('transactions').insert({ ...payload, user_id: session?.user?.id });
    if (error) throw error;
    return data;
  };

  const updateTransaction = async (id: number, payload: Partial<Transaction>) => {
    const { data, error } = await supabase.from('transactions').update(payload).eq('id', id);
    if (error) throw error;
    return data;
  };

  const deleteTransaction = async (id: number) => {
    const { data, error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
    return data;
  };

  const deleteAllTransactions = async () => {
    const { error } = await supabase.from('transactions').delete().neq('id', 0); // Delete all condition
    if (error) throw error;
  };

  return {
    transactions,
    loading,
    fetchTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    deleteAllTransactions,
  };
}
