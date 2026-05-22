import type { Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Badge from '../atoms/Badge';
import ActionButtons from '../molecules/ActionButtons';
import DataTable, { type Column } from '../organisms/DataTable';

interface TransactionTableProps {
  transactions: Transaction[];
  onDelete: (id: number) => void;
  onEdit: (tx: Transaction) => void;
  title?: string;
  loading?: boolean;
  pagination?: boolean;
  pageSize?: number;
  getCategoryEmoji?: (type: string, name: string) => string;
}

export default function TransactionTable({
  transactions,
  onDelete,
  onEdit,
  title = 'Riwayat Transaksi',
  loading = false,
  pagination = false,
  pageSize = 10,
  getCategoryEmoji,
}: TransactionTableProps) {
  const columns: Column<Transaction>[] = [
    {
      key: 'date',
      label: 'Tanggal',
      sortable: true,
      render: (tx) => formatDate(tx.date),
    },
    {
      key: 'description',
      label: 'Keterangan',
      sortable: true,
      render: (tx) => (
        <div className="break-words max-w-[250px]">
          <div className="font-semibold text-textMain break-words">{tx.description}</div>
          {tx.note && <div className="text-[10.5px] font-normal text-text3 mt-0.5 break-words">{tx.note}</div>}
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Kategori',
      sortable: true,
      render: (tx) => (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-surface2 rounded-full border border-border text-[11.5px] text-textMain font-medium">
          <span>{getCategoryEmoji ? getCategoryEmoji(tx.type, tx.category) : '📑'}</span>
          <span>{tx.category}</span>
        </span>
      ),
    },
    {
      key: 'method',
      label: 'Jenis Kas',
      sortable: true,
      render: (tx) => (
        <span className="inline-flex items-center px-2 py-1 bg-surface3 rounded-md text-[11.5px] font-semibold text-textMain border border-border uppercase">
          {tx.method || 'Tunai'}
        </span>
      ),
    },
    {
      key: 'type',
      label: 'Tipe',
      sortable: true,
      render: (tx) => (
        <Badge
          label={tx.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}
          variant={tx.type === 'pemasukan' ? 'income' : 'expense'}
          icon={tx.type === 'pemasukan' ? '↑' : '↓'}
        />
      ),
    },
    {
      key: 'amount',
      label: 'Jumlah',
      sortable: true,
      align: 'right',
      render: (tx) => (
        <span
          className={`font-bold font-[tnum] text-[14px] ${tx.type === 'pemasukan' ? 'text-income' : 'text-expense'}`}
        >
          {tx.type === 'pemasukan' ? '+' : '-'} {formatCurrency(tx.amount)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Aksi',
      align: 'center',
      render: (tx) => (
        <div className="flex justify-center">
          <ActionButtons onEdit={() => onEdit(tx)} onDelete={() => onDelete(tx.id)} />
        </div>
      ),
    },
  ];

  const mobileCard = (tx: Transaction) => (
    <>
      <div className="flex justify-between items-start mb-3 gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[14px] text-textMain break-words">{tx.description}</div>
          <div className="text-[11.5px] text-text3 mt-0.5">{formatDate(tx.date)}</div>
          {tx.note && <div className="text-[11px] font-normal text-text2 mt-1 break-words">{tx.note}</div>}
        </div>
        <div
          className={`flex-shrink-0 text-right font-bold font-[tnum] text-[14px] ${tx.type === 'pemasukan' ? 'text-income' : 'text-expense'}`}
        >
          {tx.type === 'pemasukan' ? '+' : '-'} {formatCurrency(tx.amount)}
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border/50 pt-3 mt-1 gap-2">
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0 mr-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-surface2 rounded-full border border-border text-[11px] text-textMain font-medium">
            <span>{getCategoryEmoji ? getCategoryEmoji(tx.type, tx.category) : '📑'}</span>
            <span>{tx.category}</span>
          </span>
          <span className="px-2 py-0.5 bg-surface3 rounded text-[10px] font-semibold text-textMain uppercase border border-border">
            {tx.method || 'Tunai'}
          </span>
          <Badge
            label={tx.type === 'pemasukan' ? 'Masuk' : 'Keluar'}
            variant={tx.type === 'pemasukan' ? 'income' : 'expense'}
            icon={tx.type === 'pemasukan' ? '↑' : '↓'}
            className="text-[10px]"
          />
        </div>
        <div className="flex-shrink-0">
          <ActionButtons onEdit={() => onEdit(tx)} onDelete={() => onDelete(tx.id)} />
        </div>
      </div>
    </>
  );

  return (
    <DataTable
      title={`${title} (${transactions.length})`}
      columns={columns}
      data={transactions}
      keyExtractor={(tx) => tx.id}
      loading={loading}
      emptyMessage="Tidak ada transaksi ditemukan yang cocok."
      emptyIcon="📝"
      pagination={pagination}
      pageSize={pageSize}
      mobileCard={mobileCard}
    />
  );
}
