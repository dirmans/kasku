import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { CustomerPayment, Session } from '../types';

export function useCustomerPayments(session: Session | null) {
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [allPayments, setAllPayments] = useState<CustomerPayment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchPayments = useCallback(
    async (invoiceId: number) => {
      if (!session?.user?.id) return [];
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('customer_payments')
          .select('*, payment_methods(name, emoji)')
          .eq('customer_invoice_id', invoiceId)
          .order('payment_date', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) throw error;
        const result = (data as CustomerPayment[]) || [];
        setPayments(result);
        return result;
      } catch (err) {
        console.error('Error fetching customer payments:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [session],
  );

  const fetchAllPayments = useCallback(async () => {
    if (!session?.user?.id) return [];
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customer_payments')
        .select('*, payment_methods(name, emoji)')
        .order('payment_date', { ascending: false });

      if (error) throw error;
      const result = (data as CustomerPayment[]) || [];
      setAllPayments(result);
      return result;
    } catch (err) {
      console.error('Error fetching all customer payments:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session]);

  const addPayment = async (payload: Partial<CustomerPayment>) => {
    if (!session?.user?.id) throw new Error('Sesi tidak valid');
    const { data, error } = await supabase
      .from('customer_payments')
      .insert({ ...payload, user_id: session.user.id })
      .select();
    if (error) throw error;
    return data[0] as CustomerPayment;
  };

  const deletePayment = async (id: number) => {
    const { data, error } = await supabase.from('customer_payments').delete().eq('id', id).select();
    if (error) throw error;
    return data;
  };

  return {
    payments,
    allPayments,
    loading,
    fetchPayments,
    fetchAllPayments,
    addPayment,
    deletePayment,
  };
}
