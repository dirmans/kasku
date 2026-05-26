import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { CustomerInvoice, Session } from '../types';

export function useCustomerInvoices(session: Session | null) {
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchInvoices = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customer_invoices')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices((data as CustomerInvoice[]) || []);
      return data;
    } catch (err) {
      console.error('Error fetching customer invoices:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session]);

  const addInvoice = async (payload: Partial<CustomerInvoice>) => {
    const { data, error } = await supabase
      .from('customer_invoices')
      .insert({ ...payload, user_id: session?.user?.id })
      .select();
    if (error) throw error;
    return data;
  };

  const updateInvoice = async (id: number, payload: Partial<CustomerInvoice>) => {
    const { data, error } = await supabase.from('customer_invoices').update(payload).eq('id', id).select();
    if (error) throw error;
    return data;
  };

  const deleteInvoice = async (id: number) => {
    const { data, error } = await supabase.from('customer_invoices').delete().eq('id', id);
    if (error) throw error;
    return data;
  };

  return {
    invoices,
    loading,
    fetchInvoices,
    addInvoice,
    updateInvoice,
    deleteInvoice,
  };
}
