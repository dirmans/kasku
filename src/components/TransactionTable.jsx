export default function TransactionTable({ transactions, onDelete, onEdit }) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-surface rounded-xl border border-border shadow-sm p-10 text-center text-text3">
        <div className="text-[32px] mb-2.5">📝</div>
        <div className="text-[14px] font-semibold text-text2 mb-1">Belum ada transaksi</div>
        <div className="text-[12px]">Catatan transaksi Anda akan muncul di sini.</div>
      </div>
    );
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden mb-5">
      <div className="p-3.5 px-4.5 border-b border-border flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-[14px]">Riwayat Transaksi</h3>
        {/* Filters can go here */}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2.5 px-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.5px] text-text3 bg-surface2 border-b border-border">Tanggal</th>
              <th className="p-2.5 px-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.5px] text-text3 bg-surface2 border-b border-border">Tipe</th>
              <th className="p-2.5 px-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.5px] text-text3 bg-surface2 border-b border-border">Kategori</th>
              <th className="p-2.5 px-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.5px] text-text3 bg-surface2 border-b border-border">Deskripsi</th>
              <th className="p-2.5 px-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.5px] text-text3 bg-surface2 border-b border-border">Nominal</th>
              <th className="p-2.5 px-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.5px] text-text3 bg-surface2 border-b border-border">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.id} className="border-b border-border transition-colors hover:bg-surface2 last:border-b-0">
                <td className="p-3 px-3.5 text-[13px]">{formatDate(tx.date)}</td>
                <td className="p-3 px-3.5 text-[13px]">
                  <span className={`inline-flex items-center gap-1 py-[3px] px-[9px] rounded-full text-[11px] font-medium ${tx.type === 'income' ? 'bg-incomeBg text-income' : 'bg-expenseBg text-expense'}`}>
                    {tx.type === 'income' ? '↓ Pemasukan' : '↑ Pengeluaran'}
                  </span>
                </td>
                <td className="p-3 px-3.5 text-[13px]">
                  <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded font-medium text-[11px] bg-surface2 text-text2 border border-border">
                    {tx.category || '-'}
                  </span>
                </td>
                <td className="p-3 px-3.5 text-[13px]">{tx.description || '-'}</td>
                <td className={`p-3 px-3.5 text-[13px] font-semibold font-[tnum] ${tx.type === 'income' ? 'text-income' : 'text-expense'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </td>
                <td className="p-3 px-3.5 text-[13px] text-right space-x-1">
                  <button 
                    onClick={() => onEdit(tx)}
                    className="p-1 px-2 rounded border border-border bg-transparent text-text2 text-[12px] transition-colors hover:bg-surface hover:text-textMain"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={() => onDelete(tx.id)}
                    className="p-1 px-2 rounded border border-border bg-transparent text-text2 text-[12px] transition-colors hover:bg-expenseBg hover:text-expense hover:border-[#f1c4c4]"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
