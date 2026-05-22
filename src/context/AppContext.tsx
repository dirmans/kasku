import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useCategories } from '../hooks/useCategories';
import { usePaymentMethods } from '../hooks/usePaymentMethods';
import { useTransactions } from '../hooks/useTransactions';
import { supabase } from '../lib/supabase';
import type { Category, PaymentMethod, Session, Transaction } from '../types';

interface AppContextType {
  session: Session | null;
  authLoading: boolean;
  dataLoading: boolean;
  loading: boolean;
  transactions: Transaction[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  fetchData: () => Promise<void>;
  fetchTransactions: () => Promise<Transaction[] | undefined>;
  fetchCategories: () => Promise<Category[] | undefined>;
  fetchPaymentMethods: () => Promise<PaymentMethod[] | undefined>;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  editingTransaction: Transaction | null;
  setEditingTransaction: (tx: Transaction | null) => void;
  openTransactionModal: (tx?: Transaction | null) => void;
  handleDeleteTransaction: (id: number) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const [dataLoading, setDataLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const { transactions, fetchTransactions } = useTransactions(session);
  const { categories, fetchCategories } = useCategories(session);
  const { paymentMethods, fetchPaymentMethods } = usePaymentMethods(session);

  const runDataMigration = useCallback(
    async (loadedTransactions: Transaction[]) => {
      if (!session?.user?.id || !loadedTransactions) return;

      // Cari transaksi yang memiliki category Mamad atau Nova (case-insensitive)
      const targets = loadedTransactions.filter((tx) => {
        const cat = tx.category ? tx.category.toLowerCase() : '';
        return cat === 'mamad' || cat === 'nova';
      });

      if (targets.length === 0) return;

      console.log(`Starting migration for ${targets.length} transactions...`);
      let updatedCount = 0;

      try {
        for (const tx of targets) {
          const catLower = tx.category.toLowerCase();
          const newMethod = catLower === 'mamad' ? 'TF Mamad' : 'TF Nova';
          const newCategory = tx.type === 'pemasukan' ? 'Pembayaran pelanggan' : 'Lainnya';

          const { error } = await supabase
            .from('transactions')
            .update({ method: newMethod, category: newCategory })
            .eq('id', tx.id);

          if (error) {
            console.error(`Failed to migrate transaction ID ${tx.id}:`, error);
          } else {
            updatedCount++;
          }
        }

        if (updatedCount > 0) {
          console.log(`Successfully migrated ${updatedCount} transactions.`);
          await fetchTransactions();
        }
      } catch (err) {
        console.error('Migration error:', err);
      }
    },
    [session, fetchTransactions],
  );

  const fetchData = useCallback(async () => {
    if (!session?.user?.id) return;
    setDataLoading(true);
    try {
      const [txs] = await Promise.all([fetchTransactions(), fetchCategories(), fetchPaymentMethods()]);

      if (txs) {
        await runDataMigration(txs);
      }
    } catch (err) {
      console.error('Error fetching context data:', err);
      toast.error('Gagal memuat data aplikasi');
    } finally {
      setDataLoading(false);
    }
  }, [session, fetchTransactions, fetchCategories, fetchPaymentMethods, runDataMigration]);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session, fetchData]);

  const openTransactionModal = useCallback((tx?: Transaction | null) => {
    setEditingTransaction(tx || null);
    setIsModalOpen(true);
  }, []);

  const handleDeleteTransaction = useCallback(
    async (id: number) => {
      if (!confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) return;
      try {
        const { error } = await supabase.from('transactions').delete().eq('id', id);
        if (error) throw error;
        toast.success('Transaksi berhasil dihapus!');
        await fetchData();
      } catch (error) {
        const err = error as Error;
        toast.error(`Gagal menghapus transaksi: ${err.message}`);
      }
    },
    [fetchData],
  );

  const loading = authLoading || dataLoading;

  const value: AppContextType = {
    session,
    authLoading,
    dataLoading,
    loading,
    transactions,
    categories,
    paymentMethods,
    fetchData,
    fetchTransactions,
    fetchCategories,
    fetchPaymentMethods,
    isModalOpen,
    setIsModalOpen,
    editingTransaction,
    setEditingTransaction,
    openTransactionModal,
    handleDeleteTransaction,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
