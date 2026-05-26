import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, SupplierPayment } from '../types';

export function useSupplierPayments(session: Session | null) {
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [allPayments, setAllPayments] = useState<SupplierPayment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchPayments = useCallback(
    async (supplierId: number) => {
      if (!session?.user?.id) return [];
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('supplier_payments')
          .select('*, payment_methods(name, emoji)')
          .eq('supplier_id', supplierId)
          .order('payment_date', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) throw error;
        const result = (data as SupplierPayment[]) || [];
        setPayments(result);
        return result;
      } catch (err) {
        console.error('Error fetching supplier payments:', err);
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
        .from('supplier_payments')
        .select('*, payment_methods(name, emoji)')
        .order('payment_date', { ascending: false });

      if (error) throw error;
      const result = (data as SupplierPayment[]) || [];
      setAllPayments(result);
      return result;
    } catch (err) {
      console.error('Error fetching all supplier payments:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session]);

  const addPayment = async (payload: Partial<SupplierPayment>) => {
    if (!session?.user?.id) throw new Error('Sesi tidak valid');
    const { data, error } = await supabase
      .from('supplier_payments')
      .insert({ ...payload, user_id: session.user.id })
      .select();
    if (error) throw error;
    return data[0] as SupplierPayment;
  };

  const deletePayment = async (id: number) => {
    const { data, error } = await supabase.from('supplier_payments').delete().eq('id', id).select();
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
