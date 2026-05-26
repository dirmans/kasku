import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import ActionButtons from '../../components/molecules/ActionButtons';
import PageHeader from '../../components/molecules/PageHeader';
import StatCard from '../../components/molecules/StatCard';
import DataTable, { type Column } from '../../components/organisms/DataTable';
import { useAppContext } from '../../context/AppContext';
import { useCapitalV2 } from '../../hooks/useCapitalV2';
import { useCustomerInvoices } from '../../hooks/useCustomerInvoices';
import { useCustomerPayments } from '../../hooks/useCustomerPayments';
import { useSupplierPayments } from '../../hooks/useSupplierPayments';
import { useSuppliers } from '../../hooks/useSuppliers';
import type { CustomerInvoice, Supplier } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function SuppliersPage() {
  const isDev = import.meta.env.DEV;
  const { session, paymentMethods, transactions } = useAppContext();
  const {
    suppliers,
    loading: loadingSuppliers,
    fetchSuppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
  } = useSuppliers(session);
  const { records: capitalRecords, loading: loadingCapital, fetchRecords } = useCapitalV2(session);
  const { invoices, fetchInvoices } = useCustomerInvoices(session);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);

  // State untuk Modal Bayar Hutang
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedRecordForPay, setSelectedRecordForPay] = useState<any>(null); // Menyimpan selectedSupplier
  const [payAmount, setPayAmount] = useState<number | ''>('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNote, setPayNote] = useState('');
  const [payMethodId, setPayMethodId] = useState<string>('');
  const [paying, setPaying] = useState(false);

  // State untuk Modal Riwayat Pembayaran
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedRecordForHistory, setSelectedRecordForHistory] = useState<any>(null); // Menyimpan selectedSupplier
  const {
    payments,
    allPayments,
    loading: loadingPayments,
    fetchPayments,
    fetchAllPayments,
    addPayment,
    deletePayment,
  } = useSupplierPayments(session);
  const { allPayments: allCustomerPayments, fetchAllPayments: fetchAllCustomerPayments } = useCustomerPayments(session);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSuppliers();
    fetchRecords();
    fetchInvoices();
    if (isDev) {
      fetchAllPayments();
      fetchAllCustomerPayments();
    }
  }, [fetchSuppliers, fetchRecords, fetchInvoices, fetchAllPayments, fetchAllCustomerPayments]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setContactInfo('');
    setDescription('');
    setShowForm(false);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setName(supplier.name);
    setContactInfo(supplier.contact_info || '');
    setDescription(supplier.description || '');
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return toast.error('Sesi tidak valid.');
    if (!name.trim()) return toast.error('Nama supplier harus diisi');

    setSubmitting(true);
    try {
      const payload = {
        user_id: session.user.id,
        name: name.trim(),
        contact_info: contactInfo.trim() || null,
        description: description.trim() || null,
      };

      if (editingId) {
        await updateSupplier(editingId, payload);
      } else {
        await addSupplier(payload);
      }

      toast.success(editingId ? 'Supplier berhasil diperbarui!' : 'Supplier berhasil ditambahkan!');
      resetForm();
      fetchSuppliers();
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error('Gagal menyimpan supplier. Pastikan tabel suppliers sudah dibuat di database Supabase Anda.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (
      !confirm(
        'Apakah Anda yakin ingin menghapus supplier ini? Pilihan modal yang terhubung akan dikosongkan (SET NULL).',
      )
    )
      return;
    try {
      await deleteSupplier(id);
      toast.success('Supplier berhasil dihapus');
      if (selectedSupplierId === id) {
        setSelectedSupplierId(null);
      }
      fetchSuppliers();
      fetchRecords(); // re-fetch capital records to reflect supplier deletion
    } catch (error) {
      const err = error as Error;
      toast.error(`Gagal menghapus supplier: ${err.message}`);
    }
  };

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    if (!searchTerm) return suppliers;
    const lowerSearch = searchTerm.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(lowerSearch) ||
        (s.contact_info && s.contact_info.toLowerCase().includes(lowerSearch)) ||
        (s.description && s.description.toLowerCase().includes(lowerSearch)),
    );
  }, [suppliers, searchTerm]);

  // Aggregate stats per supplier
  const supplierStatsMap = useMemo(() => {
    const map = new Map<number, { totalCapital: number; totalRevenue: number; itemsCount: number }>();

    capitalRecords.forEach((record) => {
      if (record.supplier_id) {
        const stats = map.get(record.supplier_id) || { totalCapital: 0, totalRevenue: 0, itemsCount: 0 };
        stats.totalCapital += Number(record.buy_price) * Number(record.quantity);
        stats.totalRevenue += Number(record.sell_price) * Number(record.quantity);
        stats.itemsCount += 1;
        map.set(record.supplier_id, stats);
      }
    });

    return map;
  }, [capitalRecords]);

  // List supplier yang memiliki data modal terhubung
  const supplierPaymentsMap = useMemo(() => {
    const map = new Map<number, number>();
    allPayments.forEach((p) => {
      const current = map.get(p.supplier_id) || 0;
      map.set(p.supplier_id, current + Number(p.amount));
    });
    return map;
  }, [allPayments]);

  const suppliersWithStats = useMemo(() => {
    return filteredSuppliers.map((s) => {
      const stats = supplierStatsMap.get(s.id) || { totalCapital: 0, totalRevenue: 0, itemsCount: 0 };
      const totalPaid = supplierPaymentsMap.get(s.id) || 0;
      const remainingDebt = Math.max(0, stats.totalCapital - totalPaid);
      return {
        ...s,
        totalCapital: stats.totalCapital,
        totalRevenue: stats.totalRevenue,
        itemsCount: stats.itemsCount,
        profit: stats.totalRevenue - stats.totalCapital,
        totalPaid,
        remainingDebt,
      };
    });
  }, [filteredSuppliers, supplierStatsMap, supplierPaymentsMap]);

  // Supplier detail data
  const selectedSupplier = useMemo(() => {
    if (selectedSupplierId === null) return null;
    return suppliersWithStats.find((s) => s.id === selectedSupplierId) || null;
  }, [selectedSupplierId, suppliersWithStats]);

  // Capital records associated with selected supplier
  const selectedSupplierRecords = useMemo(() => {
    if (selectedSupplierId === null) return [];
    return capitalRecords.filter((r) => r.supplier_id === selectedSupplierId);
  }, [selectedSupplierId, capitalRecords]);

  // Invoices associated with selected supplier
  const selectedSupplierInvoices = useMemo<CustomerInvoice[]>(() => {
    if (selectedSupplierId === null) return [];
    const invoiceIds = new Set(
      capitalRecords
        .filter((r) => r.supplier_id === selectedSupplierId && r.customer_invoice_id)
        .map((r) => r.customer_invoice_id),
    );
    return invoices.filter((i: CustomerInvoice) => invoiceIds.has(i.id));
  }, [selectedSupplierId, invoices, capitalRecords]);

  const debtStats = useMemo(() => {
    if (!selectedSupplier) return { totalDebt: 0, totalPaid: 0, remaining: 0 };
    return {
      totalDebt: selectedSupplier.totalCapital,
      totalPaid: selectedSupplier.totalPaid,
      remaining: selectedSupplier.remainingDebt,
    };
  }, [selectedSupplier]);

  const getMethodBalanceV2 = (methodName: string, methodId: number) => {
    let balance = 0;
    transactions.forEach((t) => {
      const m = t.method || 'Tunai';
      if (m === methodName) {
        if (t.type === 'pemasukan') balance += Number(t.amount);
        else balance -= Number(t.amount);
      }
    });

    // Subtract supplier payments (pengeluaran V2)
    allPayments.forEach((p) => {
      if (p.payment_method_id === methodId) {
        balance -= Number(p.amount);
      }
    });

    // Add customer payments (pemasukan V2)
    allCustomerPayments.forEach((p) => {
      if (p.payment_method_id === methodId) {
        balance += Number(p.amount);
      }
    });

    return balance;
  };

  const openPayModal = () => {
    if (!selectedSupplier) return;
    setSelectedRecordForPay(selectedSupplier);
    setPayAmount(selectedSupplier.remainingDebt);
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayNote('');
    setPayMethodId(paymentMethods[0]?.id?.toString() || '');
    setPayModalOpen(true);
  };

  const handlePaySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedRecordForPay) return;
    if (!payAmount || Number(payAmount) <= 0) return toast.error('Nominal pembayaran harus lebih besar dari 0');
    if (!payMethodId) return toast.error('Pilih kas sumber pembayaran');

    // Validasi saldo kas V2
    const selectedMethod = paymentMethods.find((m) => m.id === Number.parseInt(payMethodId, 10));
    if (!selectedMethod) return toast.error('Kas tidak valid');

    const currentBalance = getMethodBalanceV2(selectedMethod.name, selectedMethod.id);
    if (Number(payAmount) > currentBalance) {
      return toast.error(`Saldo kas tidak mencukupi. Saldo saat ini: ${formatCurrency(currentBalance)}`);
    }

    const maxPay = selectedRecordForPay.remainingDebt;
    if (Number(payAmount) > maxPay) {
      return toast.error(`Nominal pembayaran tidak boleh melebihi sisa hutang (${formatCurrency(maxPay)})`);
    }

    setPaying(true);
    try {
      await addPayment({
        supplier_id: selectedRecordForPay.id,
        payment_method_id: Number.parseInt(payMethodId, 10),
        amount: Number(payAmount),
        payment_date: payDate,
        note: payNote.trim() || null,
      });

      toast.success('Pembayaran hutang  berhasil dicatat!');
      setPayModalOpen(false);
      fetchAllPayments();
      fetchRecords();
      fetchSuppliers();
    } catch (err) {
      console.error(err);
      const error = err as Error;
      toast.error(`Gagal mencatat pembayaran: ${error.message || error}`);
    } finally {
      setPaying(false);
    }
  };

  const openHistoryModal = async () => {
    if (!selectedSupplier) return;
    setSelectedRecordForHistory(selectedSupplier);
    setHistoryModalOpen(true);
    await fetchPayments(selectedSupplier.id);
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus cicilan pembayaran ini?')) return;
    try {
      await deletePayment(paymentId);

      if (selectedRecordForHistory) {
        await fetchPayments(selectedRecordForHistory.id);
      }

      toast.success('Pembayaran berhasil dihapus');
      fetchAllPayments();
      fetchRecords();
      fetchSuppliers();
    } catch (err) {
      console.error(err);
      toast.error('Gagal menghapus pembayaran');
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'name',
      label: 'Nama Supplier',
      sortable: true,
      render: (s) => (
        <div
          className="cursor-pointer group"
          onClick={() => setSelectedSupplierId(selectedSupplierId === s.id ? null : s.id)}
        >
          <div className="font-semibold text-textMain group-hover:text-accent transition-colors flex items-center gap-1.5">
            <span>🏢</span> {s.name}
          </div>
          {s.description && <div className="text-[10.5px] text-text3 mt-0.5">{s.description}</div>}
        </div>
      ),
    },
    {
      key: 'contact_info',
      label: 'Kontak',
      render: (s) => <span className="text-text2 text-[12.5px]">{s.contact_info || '-'}</span>,
    },
    {
      key: 'itemsCount',
      label: 'Aset',
      align: 'center',
      render: (s) => <span className="font-[tnum] font-medium">{s.itemsCount} barang</span>,
    },
    {
      key: 'totalCapital',
      label: 'Total Hutang',
      align: 'right',
      render: (s) => <span className="font-[tnum] text-expense font-semibold">{formatCurrency(s.totalCapital)}</span>,
    },
    {
      key: 'totalPaid',
      label: 'Telah Dibayar',
      align: 'right',
      render: (s) => <span className="font-[tnum] text-income font-medium">{formatCurrency(s.totalPaid)}</span>,
    },
    {
      key: 'remainingDebt',
      label: 'Sisa Hutang',
      align: 'right',
      render: (s) => (
        <span className={`font-[tnum] font-bold ${s.remainingDebt > 0 ? 'text-expense' : 'text-income'}`}>
          {formatCurrency(s.remainingDebt)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (s) => {
        if (s.totalCapital === 0) return <span className="text-text3 text-[11px]">-</span>;
        if (s.remainingDebt === 0) {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border bg-incomeBg text-income border-income/10">
              🟢 Lunas
            </span>
          );
        }
        if (s.totalPaid > 0) {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border bg-orange-50 text-accent border-accent/10">
              🟡 DP / Cicilan
            </span>
          );
        }
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border bg-expenseBg text-expense border-expense/10">
            🔴 Belum Bayar
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Aksi',
      align: 'center',
      render: (s) => (
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedSupplierId(selectedSupplierId === s.id ? null : s.id)}
            className="px-2.5 py-1 text-[11px] font-semibold rounded-md border border-border bg-surface2 text-text2 hover:bg-border transition-colors"
          >
            {selectedSupplierId === s.id ? 'Tutup Detail' : 'Lihat Detail'}
          </button>
          <ActionButtons onEdit={() => handleEdit(s)} onDelete={() => handleDelete(s.id)} />
        </div>
      ),
    },
  ];

  const mobileCard = (s: any) => {
    const isSelected = selectedSupplierId === s.id;
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <div className="cursor-pointer" onClick={() => setSelectedSupplierId(isSelected ? null : s.id)}>
            <div className="font-semibold text-textMain text-[14px]">🏢 {s.name}</div>
            {s.description && <div className="text-[11px] text-text3 mt-0.5">{s.description}</div>}
            {s.contact_info && <div className="text-[11.5px] text-text2 mt-1">📞 {s.contact_info}</div>}
          </div>
          <ActionButtons onEdit={() => handleEdit(s)} onDelete={() => handleDelete(s.id)} />
        </div>

        <div className="grid grid-cols-2 gap-2 text-[12px] pt-2 border-t border-border/50">
          <div>
            <div className="text-text3 text-[9px] uppercase font-semibold mb-0.5">Total Hutang</div>
            <div className="font-bold text-expense">{formatCurrency(s.totalCapital)}</div>
          </div>
          <div>
            <div className="text-text3 text-[9px] uppercase font-semibold mb-0.5">Sisa Hutang</div>
            <div className="font-bold text-expense">{formatCurrency(s.remainingDebt)}</div>
          </div>
          <div className="col-span-2 pt-1 flex justify-between items-center border-t border-border/30">
            <span className="text-text3 text-[10px] uppercase font-semibold">Status</span>
            <span>
              {s.totalCapital === 0
                ? '-'
                : s.remainingDebt === 0
                  ? '🟢 Lunas'
                  : s.totalPaid > 0
                    ? '🟡 DP / Cicilan'
                    : '🔴 Belum Bayar'}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-border/30 flex justify-end">
          <button
            type="button"
            onClick={() => setSelectedSupplierId(isSelected ? null : s.id)}
            className="w-full py-1.5 text-[11px] font-bold rounded-lg border border-border bg-surface2 text-text2 hover:bg-border transition-colors text-center"
          >
            {isSelected ? 'Tutup Detail Transaksi Aset' : 'Lihat Detail Transaksi Aset'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daftar Supplier (V2)"
        subtitle="Kelola data supplier terhubung dengan inventaris modal dan aset Anda"
        actions={
          <button
            type="button"
            onClick={() => {
              if (showForm) resetForm();
              else setShowForm(true);
            }}
            className="w-full sm:w-auto px-4 py-2 bg-textMain text-white rounded-md text-[13px] font-medium transition-colors hover:bg-[#333]"
          >
            {showForm ? 'Batal' : '+ Tambah Supplier'}
          </button>
        }
      />

      {/* Form Supplier */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-surface rounded-xl border border-border p-5 shadow-sm transition-all duration-300"
        >
          <h3 className="font-semibold text-[14px] mb-4">
            {editingId ? 'Edit Data Supplier' : 'Tambah Supplier Baru'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[12px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
                Nama Supplier
              </label>
              <input
                type="text"
                placeholder="Misal: PT. Sinar Abadi, Supplier Sepatu Bandung..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[14px] outline-none focus:border-textMain focus:bg-surface"
                required
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
                Kontak (Telepon/Email)
              </label>
              <input
                type="text"
                placeholder="Misal: 0812-3456-7890 atau sales@supplier.com"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[14px] outline-none focus:border-textMain focus:bg-surface"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-[12px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
              Deskripsi/Catatan
            </label>
            <textarea
              placeholder="Detail tambahan mengenai supplier..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[14px] outline-none focus:border-textMain focus:bg-surface min-h-[80px]"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-textMain text-white rounded-lg text-[13px] font-medium hover:bg-[#333] disabled:opacity-50"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Supplier'}
            </button>
          </div>
        </form>
      )}

      {/* Filter & Search */}
      <div className="bg-surface rounded-xl border border-border p-4 shadow-sm">
        <label className="block text-[11px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
          Cari Supplier
        </label>
        <input
          type="text"
          placeholder="Cari nama supplier, kontak, atau deskripsi..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[13px] outline-none focus:border-textMain focus:bg-surface"
        />
      </div>

      {/* Suppliers Table */}
      <DataTable
        title="Daftar Supplier"
        columns={columns}
        data={suppliersWithStats}
        keyExtractor={(s) => s.id}
        loading={loadingSuppliers || loadingCapital}
        emptyMessage="Belum ada data supplier yang ditambahkan."
        emptyIcon="🏢"
        mobileCard={mobileCard}
      />

      {/* Detail Aset & Modal Terkoneksi */}
      {selectedSupplier && (
        <div className="bg-surface rounded-xl border border-border p-6 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="border-b border-border pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <span className="text-[11px] font-bold text-accent uppercase tracking-wider">Detail Supplier</span>
              <h3 className="text-[18px] font-serif font-bold text-textMain mt-0.5">🏢 {selectedSupplier.name}</h3>
              {selectedSupplier.description && (
                <p className="text-[13px] text-text2 mt-1">{selectedSupplier.description}</p>
              )}
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {debtStats.remaining > 0 && (
                <button
                  type="button"
                  onClick={openPayModal}
                  className="px-4 py-2 bg-textMain text-white rounded-lg text-[13px] font-medium hover:bg-[#333] transition-colors shadow-sm"
                >
                  💰 Bayar Hutang
                </button>
              )}
              <button
                type="button"
                onClick={openHistoryModal}
                className="px-4 py-2 border border-border bg-surface2 text-text2 rounded-lg text-[13px] font-medium hover:bg-border transition-colors shadow-sm"
              >
                🧾 Riwayat Pembayaran
              </button>
            </div>
          </div>

          {/* Mini Stats Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title="Total Hutang Belanja" value={debtStats.totalDebt} variant="expense" />
            <StatCard title="Hutang Telah Terbayar" value={debtStats.totalPaid} variant="income" />
            <StatCard
              title="Sisa Hutang Berjalan"
              value={debtStats.remaining}
              variant="accent"
              isPrefixDynamic={false}
            />
          </div>

          {/* Table of invoices from this supplier */}
          <div>
            <h4 className="font-semibold text-[13.5px] mb-3 text-text2 uppercase tracking-wide">
              🧾 Nota Transaksi Terkait ({selectedSupplierInvoices.length} Nota)
            </h4>
            {selectedSupplierInvoices.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-border rounded-lg text-text3 text-[13px] mb-6">
                Belum ada nota transaksi yang dicatat untuk supplier ini.
              </div>
            ) : (
              <div className="overflow-x-auto border border-border rounded-xl mb-6 bg-surface">
                <table className="w-full text-left border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-surface2 border-b border-border">
                      <th className="p-3 font-semibold text-text2">No. Nota</th>
                      <th className="p-3 font-semibold text-text2">Pelanggan</th>
                      <th className="p-3 font-semibold text-text2">Tanggal</th>
                      <th className="p-3 font-semibold text-text2">Status</th>
                      <th className="p-3 text-right font-semibold text-text2">Total Belanja</th>
                      <th className="p-3 text-right font-semibold text-text2">Telah Dibayar</th>
                      <th className="p-3 text-right font-semibold text-text2">Sisa Tagihan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSupplierInvoices.map((inv: CustomerInvoice) => {
                      const remaining = inv.status === 'lunas' ? 0 : inv.total_amount - inv.paid_amount;
                      return (
                        <tr key={inv.id} className="border-b border-border/50 hover:bg-surface2/30 transition-colors">
                          <td className="p-3 font-semibold text-textMain">🧾 {inv.invoice_number}</td>
                          <td className="p-3 font-medium text-textMain">👤 {inv.customer_name}</td>
                          <td className="p-3 text-text2">{formatDate(inv.date)}</td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${inv.status === 'lunas' ? 'bg-incomeBg text-income border-income/10' : inv.status === 'dp' ? 'bg-orange-50 text-accent border-accent/10' : 'bg-expenseBg text-expense border-expense/10'}`}
                            >
                              {inv.status === 'lunas' ? '🟢 Lunas' : inv.status === 'dp' ? '🟡 DP' : '🔴 Belum Lunas'}
                            </span>
                          </td>
                          <td className="p-3 text-right font-[tnum]">{formatCurrency(inv.total_amount)}</td>
                          <td className="p-3 text-right font-[tnum] text-income">
                            {formatCurrency(inv.status === 'lunas' ? inv.total_amount : inv.paid_amount)}
                          </td>
                          <td
                            className={`p-3 text-right font-[tnum] font-semibold ${remaining > 0 ? 'text-expense' : 'text-income'}`}
                          >
                            {formatCurrency(remaining)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Table of items from this supplier */}
          <div>
            <h4 className="font-semibold text-[13.5px] mb-3 text-text2 uppercase tracking-wide">
              📦 Aset Modal yang Disuplai ({selectedSupplierRecords.length} Item)
            </h4>
            {selectedSupplierRecords.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-border rounded-lg text-text3 text-[13px]">
                Belum ada barang modal/aset yang dihubungkan dengan supplier ini di halaman rekap modal.
              </div>
            ) : (
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-left border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-surface2 border-b border-border">
                      <th className="p-3 font-semibold text-text2">Tanggal</th>
                      <th className="p-3 font-semibold text-text2">Nama Barang/Aset</th>
                      <th className="p-3 text-center font-semibold text-text2">Qty</th>
                      <th className="p-3 text-right font-semibold text-text2">Harga Beli (Satuan)</th>
                      <th className="p-3 text-right font-semibold text-text2">Harga Jual (Satuan)</th>
                      <th className="p-3 text-right font-semibold text-text2">Estimasi Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSupplierRecords.map((r) => {
                      const itemCapital = Number(r.buy_price) * Number(r.quantity);
                      const itemRevenue = Number(r.sell_price) * Number(r.quantity);
                      const itemProfit = itemRevenue - itemCapital;

                      return (
                        <tr key={r.id} className="border-b border-border/50 hover:bg-surface2/30 transition-colors">
                          <td className="p-3 font-[tnum] text-text2">{formatDate(r.date)}</td>
                          <td className="p-3">
                            <span className="font-medium text-textMain">{r.item_name}</span>
                            {r.note && <span className="block text-[10.5px] text-text3 mt-0.5">{r.note}</span>}
                          </td>
                          <td className="p-3 text-center font-[tnum]">{r.quantity}</td>
                          <td className="p-3 text-right font-[tnum] text-expense">{formatCurrency(r.buy_price)}</td>
                          <td className="p-3 text-right font-[tnum] text-income">{formatCurrency(r.sell_price)}</td>
                          <td className="p-3 text-right font-[tnum] font-bold text-textMain">
                            {formatCurrency(itemProfit)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Dialog Bayar Hutang  */}
      {isDev && payModalOpen && selectedRecordForPay && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-border p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start border-b border-border pb-3">
              <div>
                <span className="text-[10px] font-bold text-expense uppercase tracking-wider">
                  Pembayaran Supplier{' '}
                </span>
                <h3 className="font-serif font-bold text-[16px] text-textMain">💰 Bayar Hutang Total</h3>
              </div>
              <button
                type="button"
                onClick={() => setPayModalOpen(false)}
                className="text-text3 hover:text-textMain text-[18px] font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="text-[13px] bg-surface2 p-3 rounded-lg border border-border space-y-1.5">
              <div className="flex justify-between">
                <span className="text-text2">Supplier:</span>
                <span className="font-semibold text-textMain">{selectedRecordForPay.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text2">Total Belanja Modal:</span>
                <span className="font-semibold text-expense">{formatCurrency(selectedRecordForPay.totalCapital)}</span>
              </div>
              <span className="block border-t border-border/50 my-1"></span>
              <div className="flex justify-between">
                <span className="text-text2">Sisa Hutang:</span>
                <span className="font-bold text-expense text-[14px]">
                  {formatCurrency(selectedRecordForPay.remainingDebt)}
                </span>
              </div>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-text2 mb-1 uppercase tracking-wider">
                  Kas / Sumber Pembayaran
                </label>
                <select
                  value={payMethodId}
                  onChange={(e) => setPayMethodId(e.target.value)}
                  className="w-full p-2.5 border border-border rounded-lg bg-surface2 text-textMain text-[13.5px] outline-none focus:border-textMain focus:bg-surface font-medium"
                  required
                >
                  <option value="">-- Pilih Kas Sumber --</option>
                  {paymentMethods.map((m) => {
                    const balance = getMethodBalanceV2(m.name, m.id);
                    return (
                      <option key={m.id} value={m.id.toString()}>
                        {m.emoji} {m.name} (Saldo: {formatCurrency(balance)})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text2 mb-1 uppercase tracking-wider">
                  Nominal Pembayaran (Rp)
                </label>
                <input
                  type="text"
                  placeholder="0"
                  value={payAmount ? new Intl.NumberFormat('id-ID').format(payAmount) : ''}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\D/g, '');
                    setPayAmount(rawValue ? Number.parseInt(rawValue, 10) : '');
                  }}
                  className="w-full p-2.5 border border-border rounded-lg bg-surface2 text-textMain text-[14px] outline-none focus:border-textMain focus:bg-surface font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-text2 mb-1 uppercase tracking-wider">
                    Tanggal Bayar
                  </label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[13px] outline-none focus:border-textMain focus:bg-surface"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-text2 mb-1 uppercase tracking-wider">
                    Catatan Opsional
                  </label>
                  <input
                    type="text"
                    placeholder="Misal: Cicilan ke-1..."
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                    className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[13px] outline-none focus:border-textMain focus:bg-surface"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="px-4 py-2 border border-border text-text2 rounded-lg text-[13px] font-medium hover:bg-surface2 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={paying}
                  className="px-4 py-2 bg-textMain text-white rounded-lg text-[13px] font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
                >
                  {paying ? 'Menyimpan...' : 'Simpan Pembayaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dialog Riwayat Pembayaran  */}
      {isDev && historyModalOpen && selectedRecordForHistory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-border p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start border-b border-border pb-3">
              <div>
                <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Detail Log </span>
                <h3 className="font-serif font-bold text-[16px] text-textMain">🧾 Riwayat Pembayaran</h3>
                <p className="text-[12px] text-text3 mt-0.5">🏢 {selectedRecordForHistory.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="text-text3 hover:text-textMain text-[18px] font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto border border-border rounded-xl">
              {loadingPayments ? (
                <div className="text-center py-8 text-text3 text-[13px]">Memuat riwayat...</div>
              ) : payments.length === 0 ? (
                <div className="text-center py-8 text-text3 text-[13px] italic">
                  Belum ada catatan pembayaran cicilan untuk supplier ini.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-[12.5px]">
                  <thead>
                    <tr className="bg-surface2 border-b border-border">
                      <th className="p-2.5 font-semibold text-text2">Tanggal</th>
                      <th className="p-2.5 font-semibold text-text2">Nominal</th>
                      <th className="p-2.5 font-semibold text-text2">Kas / Sumber</th>
                      <th className="p-2.5 font-semibold text-text2">Catatan</th>
                      <th className="p-2.5 text-center font-semibold text-text2">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-surface2/30 transition-colors">
                        <td className="p-2.5 font-[tnum] text-text2">{formatDate(p.payment_date)}</td>
                        <td className="p-2.5 font-[tnum] font-semibold text-income">{formatCurrency(p.amount)}</td>
                        <td className="p-2.5 font-medium text-textMain">
                          {p.payment_methods ? `${p.payment_methods.emoji || '💵'} ${p.payment_methods.name}` : '-'}
                        </td>
                        <td className="p-2.5 text-text2">{p.note || '-'}</td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeletePayment(p.id)}
                            className="px-2 py-0.5 text-[10px] font-semibold bg-expenseBg text-expense border border-expense/10 rounded hover:bg-expense/10 transition-colors"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-between items-center text-[13px] pt-3 border-t border-border/50">
              <div>
                <span className="text-text2">Telah Dibayar: </span>
                <span className="font-bold text-income">
                  {formatCurrency(Number(selectedRecordForHistory.totalPaid))}
                </span>
                <span className="text-text3 text-[11px]">
                  {' '}
                  dari {formatCurrency(Number(selectedRecordForHistory.totalCapital))}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-1.5 bg-textMain text-white rounded-lg text-[12px] font-medium hover:bg-[#333] transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
