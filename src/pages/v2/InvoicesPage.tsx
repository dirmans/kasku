import { jsPDF } from 'jspdf';
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
import type { CapitalRecord, CustomerInvoice } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

const generateInvoiceNumber = (dateStr: string, existingInvoices: CustomerInvoice[]) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  const [year, month, day] = parts;
  const formattedDate = `${day}-${month}-${year}`;

  const count = existingInvoices.filter((inv) => inv.date === dateStr).length;
  const seq = String(count + 1).padStart(4, '0');

  return `INV/${formattedDate}/${seq}`;
};

export default function InvoicesPage() {
  const isDev = import.meta.env.DEV;
  const { session, paymentMethods, transactions } = useAppContext();
  const {
    invoices,
    loading: loadingInvoices,
    fetchInvoices,
    addInvoice,
    updateInvoice,
    deleteInvoice,
  } = useCustomerInvoices(session);
  const { records: capitalRecords, fetchRecords, addRecord, updateRecord } = useCapitalV2(session);
  const {
    payments: customerPaymentLogs,
    allPayments: allCustomerPayments,
    fetchPayments: fetchCustomerPaymentLogs,
    fetchAllPayments: fetchAllCustomerPayments,
    addPayment: addCustomerPayment,
    deletePayment: deleteCustomerPayment,
  } = useCustomerPayments(session);
  const { allPayments: allSupplierPayments, fetchAllPayments: fetchAllSupplierPayments } = useSupplierPayments(session);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);

  // Invoice Form State
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceStatus, setInvoiceStatus] = useState<'lunas' | 'dp' | 'belum_lunas'>('belum_lunas');
  const [paidAmount, setPaidAmount] = useState<number | ''>('');
  const [invoiceNote, setInvoiceNote] = useState('');
  const [submittingInvoice, setSubmittingInvoice] = useState(false);

  // Asset Item Form State (for adding sold items to customer invoice)
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [itemName, setItemName] = useState('');
  const [buyPrice, setBuyPrice] = useState<number | ''>('');
  const [sellPrice, setSellPrice] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [supplierId, setSupplierId] = useState<string>(''); // Supplier asal barang
  const [itemNote, setItemNote] = useState('');
  const [submittingItem, setSubmittingItem] = useState(false);

  // Payment Form State (for ongoing buyer installment payment)
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmountInput, setPaymentAmountInput] = useState<number | ''>('');
  const [paymentMethodId, setPaymentMethodId] = useState<string>('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Payment History Modal State
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);

  const [itemSource, setItemSource] = useState<'new' | 'existing'>('new');
  const [selectedCapitalRecordId, setSelectedCapitalRecordId] = useState<string>('');
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    fetchInvoices();
    fetchRecords();
    if (isDev) {
      fetchAllCustomerPayments();
      fetchAllSupplierPayments();
    }
  }, [fetchInvoices, fetchRecords, fetchAllCustomerPayments, fetchAllSupplierPayments]);

  const resetInvoiceForm = () => {
    setEditingInvoiceId(null);
    setInvoiceNumber('');
    setCustomerName('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setInvoiceStatus('belum_lunas');
    setPaidAmount('');
    setInvoiceNote('');
    setShowInvoiceForm(false);
  };

  const resetItemFormFields = () => {
    setItemName('');
    setBuyPrice('');
    setSellPrice('');
    setQuantity(1);
    setSupplierId('');
    setItemNote('');
    setSelectedCapitalRecordId('');
    setStockSearchTerm('');
    setIsDropdownOpen(false);
  };

  const resetItemForm = () => {
    setEditingItemId(null);
    setItemSource('new');
    resetItemFormFields();
    setShowItemForm(false);
  };

  const handleEditInvoice = (inv: CustomerInvoice) => {
    setEditingInvoiceId(inv.id);
    setInvoiceNumber(inv.invoice_number);
    setCustomerName(inv.customer_name);
    setInvoiceDate(inv.date);
    setInvoiceStatus(inv.status);
    setPaidAmount(inv.paid_amount);
    setInvoiceNote(inv.note || '');
    setShowInvoiceForm(true);
  };

  const handleSaveInvoice = async (e: FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return toast.error('Sesi tidak valid.');
    if (!invoiceNumber.trim()) return toast.error('Nomor nota harus diisi');
    if (!customerName.trim()) return toast.error('Nama pelanggan harus diisi');

    setSubmittingInvoice(true);
    try {
      const payload: Partial<CustomerInvoice> = {
        invoice_number: invoiceNumber.trim(),
        customer_name: customerName.trim(),
        date: invoiceDate,
        status: invoiceStatus,
        paid_amount: invoiceStatus === 'lunas' ? 0 : Number(paidAmount) || 0,
        note: invoiceNote.trim() || null,
      };

      if (invoiceStatus === 'lunas') {
        if (editingInvoiceId) {
          const inv = invoices.find((i) => i.id === editingInvoiceId);
          payload.paid_amount = inv ? inv.total_amount : 0;
        } else {
          payload.paid_amount = 0;
        }
      }

      if (editingInvoiceId) {
        await updateInvoice(editingInvoiceId, payload);
      } else {
        await addInvoice(payload);
      }

      toast.success(editingInvoiceId ? 'Nota berhasil diperbarui!' : 'Nota baru berhasil dibuat!');
      resetInvoiceForm();
      fetchInvoices();
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Gagal menyimpan nota.');
    } finally {
      setSubmittingInvoice(false);
    }
  };

  const handleDeleteInvoice = async (id: number) => {
    if (
      !confirm(
        'Apakah Anda yakin ingin menghapus nota penjualan ini? Seluruh data barang yang terhubung akan dilepas hubungannya (SET NULL).',
      )
    )
      return;
    try {
      await deleteInvoice(id);
      toast.success('Nota berhasil dihapus');
      if (selectedInvoiceId === id) {
        setSelectedInvoiceId(null);
      }
      fetchInvoices();
      fetchRecords();
    } catch (error) {
      toast.error('Gagal menghapus nota');
    }
  };

  // Sync customer invoice total amount when items change (based on sell_price * quantity)
  const syncInvoiceTotal = async (invoiceId: number, currentRecords: CapitalRecord[]) => {
    const invoiceItems = currentRecords.filter((r) => r.customer_invoice_id === invoiceId);
    const total = invoiceItems.reduce((sum, item) => sum + Number(item.sell_price) * Number(item.quantity), 0);

    const invoice = invoices.find((i) => i.id === invoiceId);
    if (!invoice) return;

    const payload: Partial<CustomerInvoice> = {
      total_amount: total,
    };

    if (invoice.status === 'lunas') {
      payload.paid_amount = total;
    }

    try {
      await updateInvoice(invoiceId, payload);
      fetchInvoices();
    } catch (err) {
      console.error('Error syncing invoice total:', err);
    }
  };

  // Add Item to Customer Invoice
  const handleSaveItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId) return;
    if (itemSource === 'existing' && !selectedCapitalRecordId) {
      return toast.error('Silakan pilih barang modal dari stok');
    }
    if (!itemName.trim()) return toast.error('Nama barang harus diisi');

    const invoice = invoices.find((i) => i.id === selectedInvoiceId);
    if (!invoice) return;

    setSubmittingItem(true);
    try {
      const payload: Partial<CapitalRecord> = {
        item_name: itemName.trim(),
        buy_price: buyPrice ? Number(buyPrice) : 0,
        sell_price: sellPrice ? Number(sellPrice) : 0,
        quantity: Number(quantity) || 1,
        date: invoice.date,
        note: itemNote.trim() || undefined,
        customer_invoice_id: selectedInvoiceId,
        supplier_id: supplierId ? Number.parseInt(supplierId, 10) : null,
        user_id: session?.user?.id,
      };

      if (itemSource === 'existing' || editingItemId) {
        const recordId = editingItemId || Number.parseInt(selectedCapitalRecordId, 10);
        await updateRecord(recordId, payload);
      } else {
        await addRecord(payload);
      }

      toast.success(editingItemId ? 'Barang berhasil diperbarui!' : 'Barang berhasil ditambahkan ke nota penjualan!');
      resetItemForm();
      await fetchRecords();
      const freshRecords = await fetchRecords();
      if (freshRecords) {
        await syncInvoiceTotal(selectedInvoiceId, freshRecords as CapitalRecord[]);
      }
    } catch (error) {
      console.error('Error saving item:', error);
      const err = error as Error;
      toast.error(`Gagal menyimpan barang belanja: ${err.message || 'Error tidak diketahui'}`);
    } finally {
      setSubmittingItem(false);
    }
  };

  const handleDeleteItem = async (recordId: number) => {
    if (
      !confirm('Apakah Anda yakin ingin melepas barang belanja ini dari nota? Barang akan dikembalikan ke stok bebas.')
    )
      return;
    try {
      await updateRecord(recordId, { customer_invoice_id: null, sell_price: 0 });
      toast.success('Barang berhasil dilepas dari nota dan kembali ke stok');
      const freshRecords = await fetchRecords();
      if (freshRecords && selectedInvoiceId) {
        await syncInvoiceTotal(selectedInvoiceId, freshRecords as CapitalRecord[]);
      }
    } catch (error) {
      console.error('Error releasing item:', error);
      const err = error as Error;
      toast.error(`Gagal melepas barang: ${err.message || 'Error tidak diketahui'}`);
    }
  };

  // Calculate V2 method balance (consistent with SuppliersPage, dev only)
  const getMethodBalanceV2 = (methodName: string, methodId: number) => {
    if (!isDev) return 0;
    let balance = 0;
    // Base balance from V1 transactions (read-only)
    transactions.forEach((t) => {
      const m = t.method || 'Tunai';
      if (m === methodName) {
        if (t.type === 'pemasukan') balance += Number(t.amount);
        else balance -= Number(t.amount);
      }
    });

    // Subtract supplier payments (pengeluaran V2)
    allSupplierPayments.forEach((p) => {
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

  // Submit ongoing payment from buyer
  const handleSavePayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId) return;
    if (!paymentAmountInput || Number(paymentAmountInput) <= 0)
      return toast.error('Masukkan nominal pembayaran yang valid');
    if (!paymentMethodId) return toast.error('Pilih kas tujuan pembayaran');

    const invoice = invoices.find((i) => i.id === selectedInvoiceId);
    if (!invoice) return;

    setSubmittingPayment(true);
    try {
      const currentPaid = Number(invoice.paid_amount) || 0;
      const newPaid = currentPaid + Number(paymentAmountInput);
      const isPaidOff = newPaid >= Number(invoice.total_amount);

      // 1. Log payment to customer_payments table
      if (isDev) {
        await addCustomerPayment({
          customer_invoice_id: selectedInvoiceId,
          payment_method_id: Number.parseInt(paymentMethodId, 10),
          amount: Number(paymentAmountInput),
          payment_date: new Date().toISOString().split('T')[0],
          note: null,
        });
      }

      // 2. Update invoice paid_amount and status
      const payload: Partial<CustomerInvoice> = {
        paid_amount: isPaidOff ? invoice.total_amount : newPaid,
        status: isPaidOff ? 'lunas' : 'dp',
      };

      await updateInvoice(selectedInvoiceId, payload);
      toast.success(
        isPaidOff
          ? 'Pembayaran lunas! Nota pelanggan diperbarui menjadi LUNAS.'
          : 'Pembayaran cicilan berhasil dicatat.',
      );
      setShowPaymentForm(false);
      setPaymentAmountInput('');
      setPaymentMethodId('');
      fetchInvoices();
      fetchCustomerPaymentLogs(selectedInvoiceId);
      fetchAllCustomerPayments();
    } catch (error) {
      console.error('Error saving payment:', error);
      toast.error('Gagal mencatat pembayaran.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Delete a customer payment log entry and recalculate invoice
  const handleDeletePaymentLog = async (paymentId: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan pembayaran ini? Sisa piutang akan dihitung ulang.')) return;
    if (!selectedInvoiceId) return;

    try {
      if (isDev) {
        await deleteCustomerPayment(paymentId);

        // Recalculate paid_amount from remaining payment logs
        const remainingLogs = await fetchCustomerPaymentLogs(selectedInvoiceId);
        const totalPaidFromLogs = (remainingLogs || []).reduce((sum, p) => sum + Number(p.amount), 0);

        const invoice = invoices.find((i) => i.id === selectedInvoiceId);
        if (invoice) {
          const isPaidOff = totalPaidFromLogs >= Number(invoice.total_amount);
          let newStatus: 'lunas' | 'dp' | 'belum_lunas' = 'belum_lunas';
          if (isPaidOff) newStatus = 'lunas';
          else if (totalPaidFromLogs > 0) newStatus = 'dp';

          await updateInvoice(selectedInvoiceId, {
            paid_amount: isPaidOff ? invoice.total_amount : totalPaidFromLogs,
            status: newStatus,
          });
        }
      }
      toast.success('Catatan pembayaran berhasil dihapus. Piutang telah dihitung ulang.');
      fetchInvoices();
      fetchAllCustomerPayments();
    } catch (error) {
      console.error('Error deleting payment log:', error);
      toast.error('Gagal menghapus catatan pembayaran.');
    }
  };

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    if (!searchTerm) return invoices;
    const lowerSearch = searchTerm.toLowerCase();
    return invoices.filter(
      (i) =>
        i.invoice_number.toLowerCase().includes(lowerSearch) ||
        i.customer_name.toLowerCase().includes(lowerSearch) ||
        (i.note && i.note.toLowerCase().includes(lowerSearch)),
    );
  }, [invoices, searchTerm]);

  // Invoice Details
  const selectedInvoice = useMemo(() => {
    if (selectedInvoiceId === null) return null;
    return invoices.find((i) => i.id === selectedInvoiceId) || null;
  }, [selectedInvoiceId, invoices]);

  // Items under selected invoice
  const selectedInvoiceItems = useMemo(() => {
    if (selectedInvoiceId === null) return [];
    return capitalRecords.filter((r) => r.customer_invoice_id === selectedInvoiceId);
  }, [selectedInvoiceId, capitalRecords]);

  // Available stock items that can be attached to an invoice
  const availableStockRecords = useMemo(() => {
    let result = capitalRecords.filter((r) => !r.customer_invoice_id || r.id === editingItemId);
    if (stockSearchTerm) {
      const lower = stockSearchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          r.item_name.toLowerCase().includes(lower) ||
          (r.suppliers?.name && r.suppliers.name.toLowerCase().includes(lower)) ||
          (r.note && r.note.toLowerCase().includes(lower)),
      );
    }
    return result;
  }, [capitalRecords, editingItemId, stockSearchTerm]);

  // Invoice print-out generator (struk belanja pembeli)
  const handlePrintBuyerInvoice = () => {
    if (!selectedInvoice) return;
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 150 + selectedInvoiceItems.length * 12], // Struk Roll Thermal 80mm
      });

      const pageW = 80;
      const margin = 5;
      let y = 10;

      // Title & Shop Info
      doc.setFont('courier', 'bold');
      doc.setFontSize(13);
      doc.text('KASKU SHOP', pageW / 2, y, { align: 'center' });
      y += 5;
      doc.setFontSize(8);
      doc.setFont('courier', 'normal');
      doc.text('Bhineka Djaya Primasatya', pageW / 2, y, { align: 'center' });
      y += 4;
      doc.text('Telp: 0812-3456-7890', pageW / 2, y, { align: 'center' });
      y += 6;

      // Divider line
      doc.text('-'.repeat(38), margin, y);
      y += 4;

      // Invoice info
      doc.text(`Nota  : ${selectedInvoice.invoice_number}`, margin, y);
      y += 4;
      doc.text(`Tgl   : ${formatDate(selectedInvoice.date)}`, margin, y);
      y += 4;
      doc.text(`Cust  : ${selectedInvoice.customer_name}`, margin, y);
      y += 4;
      doc.text(`Kasir : Admin KasKu`, margin, y);
      y += 5;

      // Divider line
      doc.text('-'.repeat(38), margin, y);
      y += 4;

      // Header Table (Items)
      doc.setFont('courier', 'bold');
      doc.text('Barang/Qty', margin, y);
      doc.text('Total', pageW - margin, y, { align: 'right' });
      y += 5;
      doc.setFont('courier', 'normal');

      // Loop items using sell_price (harga jual untuk pembeli)
      selectedInvoiceItems.forEach((item) => {
        const itemTotalSale = Number(item.sell_price) * Number(item.quantity);

        let nameLine = item.item_name;
        if (nameLine.length > 20) nameLine = nameLine.substring(0, 18) + '..';

        doc.text(`${nameLine}`, margin, y);
        doc.text(formatCurrency(itemTotalSale), pageW - margin, y, { align: 'right' });
        y += 4;
        doc.text(`  ${item.quantity} x ${formatCurrency(item.sell_price)}`, margin, y);
        y += 5;
      });

      // Divider line
      doc.text('-'.repeat(38), margin, y);
      y += 4;

      // Totals
      doc.setFont('courier', 'bold');
      doc.text('TOTAL PENJUALAN:', margin, y);
      doc.text(formatCurrency(selectedInvoice.total_amount), pageW - margin, y, { align: 'right' });
      y += 5;

      const paid = selectedInvoice.status === 'lunas' ? selectedInvoice.total_amount : selectedInvoice.paid_amount;
      doc.text('TELAH DIBAYAR   :', margin, y);
      doc.text(formatCurrency(paid), pageW - margin, y, { align: 'right' });
      y += 5;

      const remaining =
        selectedInvoice.status === 'lunas' ? 0 : selectedInvoice.total_amount - selectedInvoice.paid_amount;
      doc.text('SISA PIUTANG    :', margin, y);
      doc.text(formatCurrency(remaining), pageW - margin, y, { align: 'right' });
      y += 6;

      const statusText = selectedInvoice.status === 'lunas' ? 'LUNAS' : selectedInvoice.status.toUpperCase();
      doc.text(`STATUS BAYAR    : ${statusText}`, margin, y);
      y += 8;

      // Footer
      doc.setFont('courier', 'normal');
      doc.setFontSize(7.5);
      doc.text('Terima Kasih Atas Pembelian Anda', pageW / 2, y, { align: 'center' });
      y += 4;
      doc.text('Barang yang sudah dibeli', pageW / 2, y, { align: 'center' });
      y += 4;
      doc.text('tidak dapat ditukar/dikembalikan.', pageW / 2, y, { align: 'center' });

      doc.save(`Nota_Penjualan-${selectedInvoice.invoice_number}.pdf`);
      toast.success('📄 Nota Penjualan Pembeli berhasil dicetak!');
    } catch (error) {
      console.error('Error generating receipt print:', error);
      toast.error('Gagal mencetak struk belanja.');
    }
  };

  const columns: Column<CustomerInvoice>[] = [
    {
      key: 'invoice_number',
      label: 'No. Nota',
      sortable: true,
      render: (inv) => (
        <div
          className="cursor-pointer font-semibold text-textMain hover:text-accent transition-colors"
          onClick={() => setSelectedInvoiceId(selectedInvoiceId === inv.id ? null : inv.id)}
        >
          🧾 {inv.invoice_number}
        </div>
      ),
    },
    {
      key: 'customer_name',
      label: 'Pelanggan / Pembeli',
      sortable: true,
      render: (inv) => <span className="font-semibold text-textMain">👤 {inv.customer_name}</span>,
    },
    {
      key: 'date',
      label: 'Tanggal',
      sortable: true,
      render: (inv) => formatDate(inv.date),
    },
    {
      key: 'status',
      label: 'Status Pembayaran',
      align: 'center',
      render: (inv) => {
        let badgeClass = '';
        let statusText = '';
        if (inv.status === 'lunas') {
          badgeClass = 'bg-incomeBg text-income border-income/20';
          statusText = '🟢 Lunas';
        } else if (inv.status === 'dp') {
          badgeClass = 'bg-orange-50 text-accent border-accent/20';
          statusText = '🟡 DP (Cicil)';
        } else {
          badgeClass = 'bg-expenseBg text-expense border-expense/20';
          statusText = '🔴 Belum Lunas';
        }

        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badgeClass}`}
          >
            {statusText}
          </span>
        );
      },
    },
    {
      key: 'total_amount',
      label: 'Total Belanja',
      align: 'right',
      sortable: true,
      render: (inv) => <span className="font-[tnum] font-bold text-income">{formatCurrency(inv.total_amount)}</span>,
    },
    {
      key: 'paid_amount',
      label: 'Telah Dibayar',
      align: 'right',
      render: (inv) => (
        <span className="font-[tnum] text-income font-medium">
          {formatCurrency(inv.status === 'lunas' ? inv.total_amount : inv.paid_amount)}
        </span>
      ),
    },
    {
      key: 'remaining',
      label: 'Sisa Tagihan (Piutang)',
      align: 'right',
      render: (inv) => {
        const remaining = inv.status === 'lunas' ? 0 : inv.total_amount - inv.paid_amount;
        return (
          <span className={`font-[tnum] font-semibold ${remaining > 0 ? 'text-expense' : 'text-income'}`}>
            {formatCurrency(remaining)}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Aksi',
      align: 'center',
      render: (inv) => (
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedInvoiceId(selectedInvoiceId === inv.id ? null : inv.id)}
            className="px-2.5 py-1 text-[11px] font-semibold rounded-md border border-border bg-surface2 text-text2 hover:bg-border transition-colors"
          >
            {selectedInvoiceId === inv.id ? 'Tutup' : 'Buka Detail'}
          </button>
          <ActionButtons onEdit={() => handleEditInvoice(inv)} onDelete={() => handleDeleteInvoice(inv.id)} />
        </div>
      ),
    },
  ];

  const mobileCard = (inv: CustomerInvoice) => {
    const isSelected = selectedInvoiceId === inv.id;
    const remaining = inv.status === 'lunas' ? 0 : inv.total_amount - inv.paid_amount;
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <div className="cursor-pointer" onClick={() => setSelectedInvoiceId(isSelected ? null : inv.id)}>
            <div className="font-semibold text-textMain text-[14px]">🧾 {inv.invoice_number}</div>
            <div className="text-[11.5px] text-text3 mt-0.5">
              {formatDate(inv.date)} • 👤 {inv.customer_name}
            </div>
          </div>
          <ActionButtons onEdit={() => handleEditInvoice(inv)} onDelete={() => handleDeleteInvoice(inv.id)} />
        </div>

        <div className="grid grid-cols-3 gap-2 text-[12px] pt-2 border-t border-border/50">
          <div>
            <div className="text-text3 text-[9px] uppercase font-semibold mb-0.5">Total Belanja</div>
            <div className="font-semibold text-income">{formatCurrency(inv.total_amount)}</div>
          </div>
          <div>
            <div className="text-text3 text-[9px] uppercase font-semibold mb-0.5">Telah Bayar</div>
            <div className="font-semibold text-income">
              {formatCurrency(inv.status === 'lunas' ? inv.total_amount : inv.paid_amount)}
            </div>
          </div>
          <div>
            <div className="text-text3 text-[9px] uppercase font-semibold mb-0.5">Sisa Tagihan</div>
            <div className={`font-bold ${remaining > 0 ? 'text-expense' : 'text-income'}`}>
              {formatCurrency(remaining)}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-border/30">
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${inv.status === 'lunas' ? 'bg-incomeBg text-income border-income/10' : inv.status === 'dp' ? 'bg-orange-50 text-accent border-accent/10' : 'bg-expenseBg text-expense border-expense/10'}`}
          >
            {inv.status === 'lunas' ? '🟢 Lunas' : inv.status === 'dp' ? '🟡 DP' : '🔴 Belum Lunas'}
          </span>
          <button
            type="button"
            onClick={() => setSelectedInvoiceId(isSelected ? null : inv.id)}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-border bg-surface2 text-text2 hover:bg-border transition-colors text-center"
          >
            {isSelected ? 'Tutup Detail' : 'Buka Detail Nota'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nota Transaksi Pelanggan & Supplier (V2)"
        subtitle="Kelola data transaksi nota, cicilan piutang pelanggan, sisa tagihan berjalan, dan cetak struk belanja"
        actions={
          <button
            type="button"
            onClick={() => {
              if (showInvoiceForm) resetInvoiceForm();
              else {
                const today = new Date().toISOString().split('T')[0];
                setInvoiceDate(today);
                setInvoiceNumber(generateInvoiceNumber(today, invoices));
                setShowInvoiceForm(true);
              }
            }}
            className="w-full sm:w-auto px-4 py-2 bg-textMain text-white rounded-md text-[13px] font-medium transition-colors hover:bg-[#333]"
          >
            {showInvoiceForm ? 'Batal' : '+ Buat Nota Pelanggan'}
          </button>
        }
      />

      {/* Invoice Form */}
      {showInvoiceForm && (
        <form
          onSubmit={handleSaveInvoice}
          className="bg-surface rounded-xl border border-border p-5 shadow-sm space-y-4"
        >
          <h3 className="font-semibold text-[14px]">
            {editingInvoiceId ? 'Edit Data Nota Pelanggan' : 'Buat Nota Pelanggan Baru'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
                Nomor Nota / Invoice
              </label>
              <input
                type="text"
                placeholder="Misal: INV/26-05-2026/0001"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[14px] outline-none focus:border-textMain focus:bg-surface"
                required
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
                Nama Pelanggan / Pembeli
              </label>
              <input
                type="text"
                placeholder="Misal: Budi Santoso, Toko Abadi..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[14px] outline-none focus:border-textMain focus:bg-surface"
                required
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
                Tanggal Penjualan
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setInvoiceDate(newDate);
                  if (!editingInvoiceId) {
                    setInvoiceNumber(generateInvoiceNumber(newDate, invoices));
                  }
                }}
                className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[14px] outline-none focus:border-textMain focus:bg-surface"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
                Status Pembayaran
              </label>
              <select
                value={invoiceStatus}
                onChange={(e) => {
                  const val = e.target.value as 'lunas' | 'dp' | 'belum_lunas';
                  setInvoiceStatus(val);
                  if (val === 'lunas' || val === 'belum_lunas') {
                    setPaidAmount('');
                  }
                }}
                className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[14.5px] outline-none focus:border-textMain focus:bg-surface"
              >
                <option value="belum_lunas">🔴 Belum Lunas</option>
                <option value="dp">🟡 DP (Cicil)</option>
                <option value="lunas">🟢 Lunas</option>
              </select>
            </div>
            {invoiceStatus === 'dp' && (
              <div>
                <label className="block text-[12px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
                  Nominal DP Awal
                </label>
                <input
                  type="text"
                  placeholder="0"
                  value={paidAmount ? new Intl.NumberFormat('id-ID').format(Number(paidAmount)) : ''}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\D/g, '');
                    setPaidAmount(rawValue ? Number.parseInt(rawValue, 10) : '');
                  }}
                  className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[14px] outline-none focus:border-textMain focus:bg-surface"
                  required
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
              Keterangan Tambahan
            </label>
            <input
              type="text"
              placeholder="Catatan pengiriman, alamat, dll..."
              value={invoiceNote}
              onChange={(e) => setInvoiceNote(e.target.value)}
              className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[14px] outline-none focus:border-textMain focus:bg-surface"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="submit"
              disabled={submittingInvoice}
              className="px-4 py-2 bg-textMain text-white rounded-lg text-[13px] font-medium hover:bg-[#333] disabled:opacity-50"
            >
              {submittingInvoice ? 'Menyimpan...' : 'Simpan Nota'}
            </button>
          </div>
        </form>
      )}

      {/* Search Filter */}
      <div className="bg-surface rounded-xl border border-border p-4 shadow-sm">
        <label className="block text-[11px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
          Cari Nota Transaksi Pelanggan
        </label>
        <input
          type="text"
          placeholder="Cari nomor nota, nama pembeli, atau catatan..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-border rounded-lg bg-surface2 text-textMain text-[13px] outline-none focus:border-textMain focus:bg-surface"
        />
      </div>

      {/* Invoices List */}
      <DataTable
        title="Daftar Nota Penjualan"
        columns={columns}
        data={filteredInvoices}
        keyExtractor={(i) => i.id}
        loading={loadingInvoices}
        emptyMessage="Belum ada data nota penjualan pelanggan terdaftar."
        emptyIcon="🧾"
        mobileCard={mobileCard}
      />

      {/* Invoice Detail Section */}
      {selectedInvoice && (
        <div className="bg-surface rounded-xl border border-border p-6 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="border-b border-border pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <span className="text-[11px] font-bold text-accent uppercase tracking-wider">Detail Nota Pelanggan</span>
              <h3 className="text-[18px] font-serif font-bold text-textMain mt-0.5">
                🧾 {selectedInvoice.invoice_number}
              </h3>
              <p className="text-[13px] text-text2 mt-1">
                Pelanggan: <span className="font-semibold text-textMain">👤 {selectedInvoice.customer_name}</span> •
                Tanggal: {formatDate(selectedInvoice.date)}
              </p>
              {selectedInvoice.note && (
                <p className="text-[12.5px] text-text3 italic mt-1">Keterangan: "{selectedInvoice.note}"</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handlePrintBuyerInvoice}
                className="px-3.5 py-1.5 text-[12.5px] font-bold rounded-lg border border-border bg-surface text-text2 hover:bg-surface2 transition-all flex items-center gap-1.5"
              >
                🖨️ Struk Pembeli
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedInvoiceId) fetchCustomerPaymentLogs(selectedInvoiceId);
                  setShowPaymentHistory(!showPaymentHistory);
                }}
                className="px-3.5 py-1.5 text-[12.5px] font-bold rounded-lg border border-border bg-surface text-text2 hover:bg-surface2 transition-all flex items-center gap-1.5"
              >
                📋 Riwayat Pembayaran
              </button>

              {selectedInvoice.status !== 'lunas' && import.meta.env.DEV && (
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethodId(paymentMethods[0]?.id?.toString() || '');
                    setShowPaymentForm(!showPaymentForm);
                  }}
                  className="px-3.5 py-1.5 text-[12.5px] font-bold rounded-lg bg-textMain text-white hover:bg-[#333] transition-all flex items-center gap-1.5"
                >
                  💵 Catat Pembayaran
                </button>
              )}
            </div>
          </div>

          {/* Payment Form */}
          {import.meta.env.DEV && showPaymentForm && (
            <form
              onSubmit={handleSavePayment}
              className="bg-surface2 rounded-xl border border-border p-4 shadow-inner space-y-4"
            >
              <h4 className="font-bold text-[13px] text-textMain">💵 Catat Pembayaran Tambahan (Piutang)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-[11px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
                    Nominal Pembayaran Masuk
                  </label>
                  <input
                    type="text"
                    placeholder="0"
                    value={paymentAmountInput ? new Intl.NumberFormat('id-ID').format(Number(paymentAmountInput)) : ''}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\D/g, '');
                      setPaymentAmountInput(rawValue ? Number.parseInt(rawValue, 10) : '');
                    }}
                    className="w-full p-2 border border-border rounded-lg bg-surface text-textMain text-[14px] outline-none focus:border-textMain"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
                    Kas / Sumber Pemasukan
                  </label>
                  <select
                    value={paymentMethodId}
                    onChange={(e) => setPaymentMethodId(e.target.value)}
                    className="w-full p-2 border border-border rounded-lg bg-surface text-textMain text-[14px] outline-none focus:border-textMain"
                    required
                  >
                    <option value="">-- Pilih Kas --</option>
                    {paymentMethods.map((m) => {
                      const balance = getMethodBalanceV2(m.name, m.id);
                      return (
                        <option key={m.id} value={m.id.toString()}>
                          {m.emoji || '💰'} {m.name} — Saldo: {formatCurrency(balance)}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={submittingPayment}
                    className="px-4 py-2 bg-income text-white rounded-lg text-[13px] font-medium hover:bg-income/90 disabled:opacity-50"
                  >
                    {submittingPayment ? 'Menyimpan...' : 'Simpan Pembayaran'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentForm(false);
                      setPaymentAmountInput('');
                      setPaymentMethodId('');
                    }}
                    className="px-4 py-2 border border-border bg-surface text-text2 rounded-lg text-[13px]"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Payment History Modal */}
          {isDev && showPaymentHistory && (
            <div className="bg-surface2 rounded-xl border border-border p-4 shadow-inner space-y-4 animate-in fade-in duration-200">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-[13px] text-textMain">📋 Riwayat Pembayaran Pelanggan</h4>
                <button
                  type="button"
                  onClick={() => setShowPaymentHistory(false)}
                  className="text-text3 hover:text-textMain text-[18px] font-bold transition-colors"
                >
                  ✕
                </button>
              </div>
              {customerPaymentLogs.length === 0 ? (
                <div className="text-center py-6 text-text3 text-[13px] italic border border-dashed border-border rounded-lg">
                  Belum ada catatan pembayaran untuk nota ini.
                </div>
              ) : (
                <div className="overflow-x-auto border border-border rounded-xl bg-surface">
                  <table className="w-full text-left border-collapse text-[13px]">
                    <thead>
                      <tr className="bg-surface2 border-b border-border">
                        <th className="p-3 font-semibold text-text2">Tanggal</th>
                        <th className="p-3 font-semibold text-text2">Kas Tujuan</th>
                        <th className="p-3 text-right font-semibold text-text2">Nominal</th>
                        <th className="p-3 font-semibold text-text2">Catatan</th>
                        <th className="p-3 text-center font-semibold text-text2">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerPaymentLogs.map((log) => (
                        <tr key={log.id} className="border-b border-border/50 hover:bg-surface2/30 transition-colors">
                          <td className="p-3 font-[tnum]">{formatDate(log.payment_date)}</td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-surface2 border border-border">
                              {log.payment_methods?.emoji || '💰'} {log.payment_methods?.name || 'Tidak diketahui'}
                            </span>
                          </td>
                          <td className="p-3 text-right font-[tnum] font-bold text-income">
                            {formatCurrency(log.amount)}
                          </td>
                          <td className="p-3 text-text3 text-[12px] italic">{log.note || '-'}</td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeletePaymentLog(log.id)}
                              className="text-[11px] font-semibold text-expense hover:text-expense/80 px-2 py-0.5 rounded border border-expense/20 hover:bg-expenseBg transition-colors"
                            >
                              🗑️ Hapus
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Invoice Summary Financials */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title="Total Belanja Pelanggan" value={selectedInvoice.total_amount} variant="income" />
            <StatCard
              title="Total Telah Dibayar"
              value={selectedInvoice.status === 'lunas' ? selectedInvoice.total_amount : selectedInvoice.paid_amount}
              variant="income"
            />
            <StatCard
              title="Sisa Tagihan (Piutang)"
              value={
                selectedInvoice.status === 'lunas' ? 0 : selectedInvoice.total_amount - selectedInvoice.paid_amount
              }
              variant={selectedInvoice.status === 'lunas' ? 'income' : 'expense'}
            />
          </div>

          {/* Items Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-[13.5px] text-text2 uppercase tracking-wide">
                📦 Daftar Barang Belanja Pelanggan ({selectedInvoiceItems.length} Item)
              </h4>
              <button
                type="button"
                onClick={() => {
                  if (showItemForm) resetItemForm();
                  else setShowItemForm(true);
                }}
                className="px-3 py-1 bg-textMain text-white rounded-md text-[12px] font-semibold hover:bg-[#333]"
              >
                {showItemForm ? 'Batal' : '+ Tambah Barang'}
              </button>
            </div>

            {/* Item Input Form */}
            {showItemForm && (
              <form
                onSubmit={handleSaveItem}
                className="bg-surface2 rounded-xl border border-border p-4 shadow-inner space-y-4 animate-in slide-in-from-top duration-300"
              >
                <h5 className="font-semibold text-[13px]">
                  {editingItemId ? '✏️ Edit Barang Penjualan' : '➕ Tambah Barang Penjualan'}
                </h5>

                {!editingItemId && (
                  <div className="flex gap-4 p-2 bg-surface rounded-lg border border-border/60">
                    <label className="flex items-center gap-1.5 text-[12.5px] font-medium text-textMain cursor-pointer">
                      <input
                        type="radio"
                        name="itemSource"
                        value="new"
                        checked={itemSource === 'new'}
                        onChange={() => {
                          setItemSource('new');
                          resetItemFormFields();
                        }}
                      />
                      Stok/Barang Baru
                    </label>
                    <label className="flex items-center gap-1.5 text-[12.5px] font-medium text-textMain cursor-pointer">
                      <input
                        type="radio"
                        name="itemSource"
                        value="existing"
                        checked={itemSource === 'existing'}
                        onChange={() => {
                          setItemSource('existing');
                          resetItemFormFields();
                        }}
                      />
                      Ambil dari Stok Tersedia
                    </label>
                  </div>
                )}

                {itemSource === 'existing' && !editingItemId && (
                  <div className="relative space-y-1.5">
                    <label className="block text-[11px] font-semibold text-text2 uppercase tracking-[0.4px]">
                      Pilih Barang Modal / Aset dari Stok ({availableStockRecords.length} tersedia)
                    </label>

                    {/* Trigger Button Display */}
                    <div
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full p-2 border border-border rounded-lg bg-surface text-textMain text-[13.5px] cursor-pointer flex justify-between items-center hover:border-textMain transition-colors"
                    >
                      <span className="truncate">
                        {selectedCapitalRecordId
                          ? (() => {
                              const r = capitalRecords.find((x) => x.id.toString() === selectedCapitalRecordId);
                              return r ? `📦 ${r.item_name} (Qty: ${r.quantity})` : '-- Pilih Barang Modal --';
                            })()
                          : '-- Pilih Barang Modal --'}
                      </span>
                      <span className="text-text3 text-[10px] ml-2">{isDropdownOpen ? '▲' : '▼'}</span>
                    </div>

                    {/* Custom Dropdown Content */}
                    {isDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-50 p-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150 max-h-[260px] flex flex-col">
                        {/* Search input inside select options panel */}
                        <input
                          type="text"
                          placeholder="Ketik untuk mencari stok..."
                          value={stockSearchTerm}
                          onChange={(e) => setStockSearchTerm(e.target.value)}
                          onClick={(e) => e.stopPropagation()} // Prevent closing dropdown
                          className="w-full p-1.5 border border-border rounded-md bg-surface2 text-textMain text-[12.5px] outline-none focus:border-textMain"
                        />

                        {/* Options List */}
                        <div className="overflow-y-auto flex-1 max-h-[170px] space-y-0.5 custom-scrollbar">
                          {availableStockRecords.length === 0 ? (
                            <div className="text-center py-3 text-text3 text-[12px] italic">
                              Tidak ada stok yang cocok
                            </div>
                          ) : (
                            availableStockRecords.map((r) => {
                              const isSelected = r.id.toString() === selectedCapitalRecordId;
                              return (
                                <div
                                  key={r.id}
                                  onClick={() => {
                                    setSelectedCapitalRecordId(r.id.toString());
                                    setItemName(r.item_name);
                                    setBuyPrice(r.buy_price);
                                    setSellPrice(r.sell_price ? r.sell_price : '');
                                    setQuantity(r.quantity);
                                    setSupplierId(r.supplier_id ? r.supplier_id.toString() : '');
                                    setItemNote(r.note || '');
                                    setIsDropdownOpen(false);
                                    setStockSearchTerm('');
                                  }}
                                  className={`p-2 rounded-md text-[12.5px] text-textMain cursor-pointer hover:bg-surface2 transition-colors flex items-center justify-between gap-2 ${isSelected ? 'bg-surface2 font-semibold border-l-2 border-textMain' : ''}`}
                                >
                                  <span className="truncate">
                                    📦 {r.item_name} (Qty: {r.quantity})
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
                      Nama Barang
                    </label>
                    <input
                      type="text"
                      placeholder="Stok Sepatu, Bahan Baku, dll..."
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      className="w-full p-2 border border-border rounded-lg bg-surface text-textMain text-[13.5px] outline-none focus:border-textMain disabled:opacity-75 disabled:bg-surface2"
                      required
                      disabled={itemSource === 'existing'}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
                      Kuantitas (Qty)
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full p-2 border border-border rounded-lg bg-surface text-textMain text-[13.5px] outline-none focus:border-textMain disabled:opacity-75 disabled:bg-surface2"
                      required
                      disabled={itemSource === 'existing'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
                      Harga Jual
                    </label>
                    <input
                      type="text"
                      placeholder="Dapat dikosongkan"
                      value={sellPrice ? new Intl.NumberFormat('id-ID').format(Number(sellPrice)) : ''}
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/\D/g, '');
                        setSellPrice(rawValue ? Number.parseInt(rawValue, 10) : '');
                      }}
                      className="w-full p-2 border border-border rounded-lg bg-surface text-textMain text-[13.5px] outline-none focus:border-textMain"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">
                      Catatan
                    </label>
                    <input
                      type="text"
                      placeholder="Catatan barang..."
                      value={itemNote}
                      onChange={(e) => setItemNote(e.target.value)}
                      className="w-full p-2 border border-border rounded-lg bg-surface text-textMain text-[13.5px] outline-none focus:border-textMain"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="submit"
                    disabled={submittingItem}
                    className="px-4 py-1.5 bg-textMain text-white rounded-lg text-[12px] font-semibold hover:bg-[#333]"
                  >
                    {submittingItem ? 'Menyimpan...' : 'Simpan Barang'}
                  </button>
                </div>
              </form>
            )}

            {/* Items Table */}
            {selectedInvoiceItems.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border rounded-xl text-text3 text-[13px]">
                Belum ada barang belanja yang dimasukkan ke dalam nota ini. Klik "Tambah Barang" di atas untuk memulai.
              </div>
            ) : (
              <div className="overflow-x-auto border border-border rounded-xl bg-surface">
                <table className="w-full text-left border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-surface2 border-b border-border">
                      <th className="p-3 font-semibold text-text2">Nama Barang</th>
                      <th className="p-3 text-center font-semibold text-text2">Qty</th>
                      <th className="p-3 text-right font-semibold text-text2">Harga Jual</th>
                      <th className="p-3 text-right font-semibold text-text2">Subtotal</th>
                      <th className="p-3 text-center font-semibold text-text2">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoiceItems.map((item) => {
                      const subtotalSell = Number(item.sell_price) * Number(item.quantity);

                      return (
                        <tr key={item.id} className="border-b border-border/50 hover:bg-surface2/30 transition-colors">
                          <td className="p-3">
                            <span className="font-semibold text-textMain">{item.item_name}</span>
                            {item.note && <span className="block text-[10.5px] text-text3 mt-0.5">{item.note}</span>}
                          </td>
                          <td className="p-3 text-center font-[tnum]">{item.quantity}</td>
                          <td className="p-3 text-right font-[tnum] text-income">
                            {item.sell_price > 0 ? (
                              formatCurrency(item.sell_price)
                            ) : (
                              <span className="text-text3 italic text-[11px]">Belum ditentukan</span>
                            )}
                          </td>
                          <td className="p-3 text-right font-[tnum] text-income font-semibold">
                            {subtotalSell > 0 ? (
                              formatCurrency(subtotalSell)
                            ) : (
                              <span className="text-text3 italic text-[11px]">-</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <ActionButtons
                              onEdit={() => {
                                setEditingItemId(item.id);
                                setItemSource('existing');
                                setSelectedCapitalRecordId(item.id.toString());
                                setItemName(item.item_name);
                                setBuyPrice(item.buy_price);
                                setSellPrice(item.sell_price ? item.sell_price : '');
                                setQuantity(item.quantity);
                                setSupplierId(item.supplier_id ? item.supplier_id.toString() : '');
                                setItemNote(item.note || '');
                                setShowItemForm(true);
                              }}
                              onDelete={() => handleDeleteItem(item.id)}
                            />
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
    </div>
  );
}
