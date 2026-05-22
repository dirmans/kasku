import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { PaymentMethod, Session } from '../types';

export function usePaymentMethods(session: Session | null) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchPaymentMethods = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      let { data, error } = await supabase.from('payment_methods').select('*').order('name');

      if (error) throw error;

      if (!data || data.length === 0) {
        const defaultMethods = [
          { name: 'Tunai', emoji: '💵' },
          { name: 'TF Nova', emoji: '💳' },
          { name: 'TF Mamad', emoji: '💳' },
        ];

        const { error: seedErr } = await supabase
          .from('payment_methods')
          .insert(defaultMethods.map((m) => ({ ...m, user_id: session.user.id })));
        if (seedErr) throw seedErr;

        // Refetch after seeding
        const { data: newData, error: newError } = await supabase.from('payment_methods').select('*').order('name');
        if (newError) throw newError;
        data = newData;
      }

      setPaymentMethods((data as PaymentMethod[]) || []);
      return data;
    } catch (err) {
      console.error('Error fetching payment methods:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session]);

  const addPaymentMethod = async (payload: Partial<PaymentMethod>) => {
    const { data, error } = await supabase.from('payment_methods').insert({ ...payload, user_id: session?.user?.id });
    if (error) throw error;
    return data;
  };

  const deletePaymentMethod = async (id: number) => {
    const { data, error } = await supabase.from('payment_methods').delete().eq('id', id);
    if (error) throw error;
    return data;
  };

  const deleteAllPaymentMethods = async () => {
    if (!session?.user?.id) return;
    const { error: err } = await supabase.from('payment_methods').delete().neq('id', 0); // Delete all
    if (err) throw err;

    // Reseed default
    const defaultMethods = [
      { name: 'Tunai', emoji: '💵' },
      { name: 'TF Nova', emoji: '💳' },
      { name: 'TF Mamad', emoji: '💳' },
    ];

    const { error: seedErr } = await supabase
      .from('payment_methods')
      .insert(defaultMethods.map((m) => ({ ...m, user_id: session.user.id })));
    if (seedErr) throw seedErr;
  };

  return {
    paymentMethods,
    loading,
    fetchPaymentMethods,
    addPaymentMethod,
    deletePaymentMethod,
    deleteAllPaymentMethods,
  };
}
