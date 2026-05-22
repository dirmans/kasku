import { type FormEvent, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAppContext } from '../../context/AppContext';
import { useTransactions } from '../../hooks/useTransactions';
import type { Session, Transaction } from '../../types';
import Modal from '../organisms/Modal';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: Transaction | null;
  session: Session | null;
  onSuccess?: () => void;
}

export default function TransactionModal({ isOpen, onClose, transaction, session, onSuccess }: TransactionModalProps) {
  const [type, setType] = useState<'pemasukan' | 'pengeluaran'>('pengeluaran');
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [method, setMethod] = useState('Tunai');
  const [loading, setLoading] = useState(false);

  const { categories, paymentMethods, fetchCategories, fetchPaymentMethods } = useAppContext();
  const { addTransaction, updateTransaction } = useTransactions(session);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchPaymentMethods();
    }
  }, [isOpen, fetchCategories, fetchPaymentMethods]);

  useEffect(() => {
    if (transaction) {
      setType(transaction.type || 'pengeluaran');
      setAmount(transaction.amount || '');
      setDate(transaction.date || '');
      setDescription(transaction.description || '');
      setCategory(transaction.category || '');
      setMethod(transaction.method || 'Tunai');
    } else {
      setType('pengeluaran');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setCategory('');
      setMethod('Tunai');
    }
  }, [transaction, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) return toast.error('Jumlah harus diisi');

    setLoading(true);
    try {
      if (!session?.user?.id) throw new Error('Unauthenticated');

      const payload = {
        user_id: session.user.id,
        type,
        amount: Number(amount),
        date,
        description: description.trim(),
        category,
        method,
        note: '',
      };

      if (transaction) {
        await updateTransaction(transaction.id, payload);
      } else {
        await addTransaction(payload);
      }

      toast.success('Transaksi berhasil disimpan!');
      if (onSuccess) onSuccess();
      else onClose();
    } catch (error) {
      const err = error as Error;
      console.error(err);
      toast.error(`Gagal menyimpan: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter((c) => c.type === type);

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        className="px-[18px] py-[10px] rounded-lg border border-border bg-surface text-textMain text-[13px] font-medium transition-colors hover:bg-surface2"
      >
        Batal
      </button>
      <button
        type="submit"
        onClick={handleSubmit}
        disabled={loading}
        className="px-[18px] py-[10px] rounded-lg border border-textMain bg-textMain text-white text-[13px] font-medium transition-colors hover:bg-[#333] disabled:opacity-50"
      >
        {loading ? 'Menyimpan...' : 'Simpan'}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={transaction ? 'Edit Transaksi' : 'Tambah Transaksi'}
      footer={footer}
      size="md"
    >
      <form id="transaction-form" onSubmit={handleSubmit}>
        <div className="mb-[14px]">
          <label className="block text-[12px] font-semibold text-text2 mb-[6px] uppercase tracking-[0.4px]">
            Jenis Transaksi
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div
              className={`p-2.5 rounded-lg border-2 cursor-pointer text-center text-[13px] font-medium transition-all ${type === 'pemasukan' ? 'bg-incomeBg border-income text-income' : 'border-border'}`}
              onClick={() => {
                setType('pemasukan');
                setCategory('');
              }}
            >
              📈 Pemasukan
            </div>
            <div
              className={`p-2.5 rounded-lg border-2 cursor-pointer text-center text-[13px] font-medium transition-all ${type === 'pengeluaran' ? 'bg-expenseBg border-expense text-expense' : 'border-border'}`}
              onClick={() => {
                setType('pengeluaran');
                setCategory('');
              }}
            >
              📉 Pengeluaran
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-[14px]">
          <div>
            <label className="block text-[12px] font-semibold text-text2 mb-[6px] uppercase tracking-[0.4px]">
              Jumlah (Rp)
            </label>
            <input
              type="text"
              className="w-full p-[10px_14px] border border-border rounded-lg bg-surface2 text-textMain text-[14px] outline-none transition-colors focus:border-textMain focus:bg-surface"
              placeholder="0"
              value={amount ? new Intl.NumberFormat('id-ID').format(amount) : ''}
              onChange={(e) => {
                const rawValue = e.target.value.replace(/\D/g, '');
                setAmount(rawValue ? parseInt(rawValue, 10) : '');
              }}
              required
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-text2 mb-[6px] uppercase tracking-[0.4px]">
              Tanggal
            </label>
            <input
              type="date"
              className="w-full p-[10px_14px] border border-border rounded-lg bg-surface2 text-textMain text-[14px] outline-none transition-colors focus:border-textMain focus:bg-surface"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="mb-[14px]">
          <label className="block text-[12px] font-semibold text-text2 mb-[6px] uppercase tracking-[0.4px]">
            Keterangan
          </label>
          <input
            type="text"
            className="w-full p-[10px_14px] border border-border rounded-lg bg-surface2 text-textMain text-[14px] outline-none transition-colors focus:border-textMain focus:bg-surface"
            placeholder="Deskripsi transaksi..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-semibold text-text2 mb-[6px] uppercase tracking-[0.4px]">
              Kategori
            </label>
            <select
              className="w-full p-[10px_14px] border border-border rounded-lg bg-surface2 text-textMain text-[14px] outline-none transition-colors focus:border-textMain focus:bg-surface"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="">Pilih kategori...</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.emoji || '📑'} {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-text2 mb-[6px] uppercase tracking-[0.4px]">
              Jenis Kas
            </label>
            <select
              className="w-full p-[10px_14px] border border-border rounded-lg bg-surface2 text-textMain text-[14px] outline-none transition-colors focus:border-textMain focus:bg-surface"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              required
            >
              {paymentMethods.map((pm) => (
                <option key={pm.id} value={pm.name}>
                  {pm.emoji || '💳'} {pm.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </form>
    </Modal>
  );
}
