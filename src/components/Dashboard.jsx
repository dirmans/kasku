import { useState, useEffect, useMemo } from 'react';
import Sidebar from './Sidebar';
import TransactionModal from './TransactionModal';
import CategoriesTab from './CategoriesTab';
import TransactionsTab from './TransactionsTab';
import ReportsTab from './ReportsTab';
import SettingsTab from './SettingsTab';
import { supabase } from '../lib/supabase';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard({ session }) {
  const isLocal = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isAuthorized = isLocal;
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  // Stats
  const [stats, setStats] = useState({
    income: 0,
    expense: 0,
    balance: 0,
    txCount: 0
  });

  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);

  // Ensure default categories are seeded for the user
  useEffect(() => {
    const ensureCategories = async () => {
      if (!session?.user?.id) return;
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id')
          .limit(1);
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
          await supabase.rpc('seed_default_categories', {
            p_user_id: session.user.id
          });
        }
      } catch (err) {
        console.error('Error ensuring default categories:', err.message);
      }
    };

    ensureCategories();
  }, [session]);

  const fetchData = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const [txRes, catRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .order('date', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase
          .from('categories')
          .select('*')
          .order('name')
      ]);

      if (txRes.error) throw txRes.error;
      if (catRes.error) throw catRes.error;

      const txList = txRes.data || [];
      const catList = catRes.data || [];

      setTransactions(txList);
      setCategories(catList);

      // Compute stats
      const inc = txList.filter(t => t.type === 'pemasukan').reduce((a, t) => a + Number(t.amount), 0);
      const exp = txList.filter(t => t.type === 'pengeluaran').reduce((a, t) => a + Number(t.amount), 0);
      const bal = inc - exp;
      
      setStats({
        income: inc,
        expense: exp,
        balance: bal,
        txCount: txList.length
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [session]);

  // Group Expenses by Category for Doughnut Chart
  const expenseByCategory = useMemo(() => {
    const groups = {};
    transactions.filter(t => t.type === 'pengeluaran').forEach(t => {
      groups[t.category] = (groups[t.category] || 0) + Number(t.amount);
    });
    return Object.entries(groups).sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  // Group Monthly Cashflow Data for Bar Chart
  const monthlyCashflow = useMemo(() => {
    const monthlyData = {};
    const chronologicalTx = [...transactions].reverse();

    chronologicalTx.forEach(t => {
      const date = new Date(t.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[key]) {
        monthlyData[key] = {
          label: date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
          income: 0,
          expense: 0
        };
      }

      if (t.type === 'pemasukan') {
        monthlyData[key].income += Number(t.amount);
      } else {
        monthlyData[key].expense += Number(t.amount);
      }
    });

    const sortedKeys = Object.keys(monthlyData).sort().slice(-6);
    return {
      labels: sortedKeys.map(k => monthlyData[k].label),
      income: sortedKeys.map(k => monthlyData[k].income),
      expense: sortedKeys.map(k => monthlyData[k].expense)
    };
  }, [transactions]);

  const handleDeleteTransaction = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) return;
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Transaksi berhasil dihapus!');
      fetchData();
    } catch (err) {
      alert('Gagal menghapus transaksi: ' + err.message);
    }
  };

  const handleEditTransaction = (tx) => {
    setEditingTransaction(tx);
    setIsModalOpen(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const getHeaderInfo = () => {
    switch (activeTab) {
      case 'dashboard':
        return { title: 'Beranda', subtitle: 'Ringkasan aktivitas keuangan Anda' };
      case 'transactions':
        return { title: 'Transaksi', subtitle: 'Lihat dan kelola seluruh transaksi keuangan Anda' };
      case 'reports':
        return { title: 'Laporan', subtitle: 'Analisis detail pemasukan & pengeluaran Anda' };
      case 'categories':
        return { title: 'Kategori', subtitle: 'Kelola kategori pemasukan & pengeluaran' };
      case 'settings':
        return { title: 'Pengaturan', subtitle: 'Ubah preferensi profil dan akun' };
      default:
        return { title: 'KasKu - Bhineka Djaya Primasatya', subtitle: 'Catatan Keuangan Pribadi' };
    }
  };

  const formatDate = (dateStr) => {
    try {
      const options = { day: 'numeric', month: 'short', year: 'numeric' };
      return new Date(dateStr).toLocaleDateString('id-ID', options);
    } catch (e) {
      return dateStr;
    }
  };

  const getCategoryEmoji = (type, catName) => {
    const found = categories.find(c => c.name === catName && c.type === type);
    return found ? found.emoji : '📦';
  };

  const renderContent = () => {
    if (activeTab === 'dashboard') {
      const recentTx = transactions.slice(0, 5);

      return (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div>
            <h2 className="text-[18px] font-bold text-textMain mb-4">Ringkasan Keuangan</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard title="Pemasukan" value={stats.income} type="income" />
              <StatCard title="Pengeluaran" value={stats.expense} type="expense" />
              <StatCard title="Sisa Saldo" value={stats.balance} type="balance" />
              <StatCard title="Total Transaksi" value={stats.txCount} type="txcount" />
            </div>
          </div>

          {/* Charts Visualization Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cashflow Trends (Large Column) */}
            <div className="bg-surface rounded-xl border border-border p-5 shadow-sm md:col-span-2">
              <h3 className="font-bold text-[14px] text-textMain uppercase tracking-[0.6px] mb-4">Tren Arus Kas Bulanan</h3>
              <div className="h-[240px]">
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-border border-t-textMain rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <Bar 
                    data={{
                      labels: monthlyCashflow.labels.length ? monthlyCashflow.labels : ['Belum ada data'],
                      datasets: [
                        {
                          label: '📈 Pemasukan',
                          data: monthlyCashflow.income.length ? monthlyCashflow.income : [0],
                          backgroundColor: '#1a6b4a',
                          borderRadius: 6,
                        },
                        {
                          label: '📉 Pengeluaran',
                          data: monthlyCashflow.expense.length ? monthlyCashflow.expense : [0],
                          backgroundColor: '#b93030',
                          borderRadius: 6,
                        }
                      ]
                    }} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'top', labels: { font: { size: 11 } } }
                      }
                    }} 
                  />
                )}
              </div>
            </div>

            {/* Category Breakdown (Small Column) */}
            <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
              <h3 className="font-bold text-[14px] text-textMain uppercase tracking-[0.6px] mb-4">Pengeluaran</h3>
              <div className="h-[240px] flex items-center justify-center">
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-border border-t-textMain rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <Doughnut 
                    data={{
                      labels: expenseByCategory.map(([name]) => name).length ? expenseByCategory.map(([name]) => name) : ['Tidak Ada Pengeluaran'],
                      datasets: [
                        {
                          data: expenseByCategory.map(([, val]) => val).length ? expenseByCategory.map(([, val]) => val) : [1],
                          backgroundColor: [
                            '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', 
                            '#ec4899', '#14b8a6', '#f43f5e', '#64748b'
                          ].slice(0, Math.max(1, expenseByCategory.length)),
                          borderWidth: 1,
                        }
                      ]
                    }} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }
                      }
                    }} 
                  />
                )}
              </div>
            </div>
          </div>

          {/* Recent Transactions Section */}
          <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[15px] text-textMain">Transaksi Terbaru</h3>
              <button 
                onClick={() => setActiveTab('transactions')} 
                className="text-[12px] font-semibold text-textMain hover:underline"
              >
                Lihat Semua →
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-12">
                <div className="w-6 h-6 border-2 border-border border-t-textMain rounded-full animate-spin"></div>
              </div>
            ) : recentTx.length === 0 ? (
              <div className="p-12 text-center text-text3 text-[13px]">
                Belum ada catatan transaksi. Silakan tambahkan transaksi baru pertama Anda!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] text-left">
                  <thead>
                    <tr className="text-text3 font-semibold uppercase tracking-[0.4px] text-[11px] border-b border-border">
                      <th className="pb-3 pt-1">Tanggal</th>
                      <th className="pb-3 pt-1">Keterangan</th>
                      <th className="pb-3 pt-1">Kategori</th>
                      <th className="pb-3 pt-1">Tipe</th>
                      <th className="pb-3 pt-1 text-right">Jumlah</th>
                      {isAuthorized && <th className="pb-3 pt-1 text-center">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {recentTx.map(t => (
                      <tr key={t.id} className="hover:bg-surface2/40 transition-colors">
                        <td className="py-3 text-text2 font-medium">{formatDate(t.date)}</td>
                        <td className="py-3 font-semibold text-textMain">
                          {t.description}
                          {t.note && (
                            <div className="text-[10.5px] font-normal text-text3 mt-0.5">{t.note}</div>
                          )}
                        </td>
                        <td className="py-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-surface2 rounded-full border border-border text-[11.5px] text-textMain font-medium">
                            <span>{getCategoryEmoji(t.type, t.category)}</span>
                            <span>{t.category}</span>
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            t.type === 'pemasukan' 
                              ? 'bg-incomeBg border-[#d0f5e1] text-income' 
                              : 'bg-expenseBg border-[#fbe3e3] text-expense'
                          }`}>
                            {t.type === 'pemasukan' ? '↑ Pemasukan' : '↓ Pengeluaran'}
                          </span>
                        </td>
                        <td className={`py-3 text-right font-bold font-[tnum] text-[14px] ${
                          t.type === 'pemasukan' ? 'text-income' : 'text-expense'
                        }`}>
                          {t.type === 'pemasukan' ? '+' : '-'} {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(t.amount)}
                        </td>
                        {isAuthorized && (
                          <td className="py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEditTransaction(t)}
                                className="p-1.5 rounded border border-border text-text3 hover:text-textMain hover:bg-surface2 transition-all"
                                title="Edit"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteTransaction(t.id)}
                                className="p-1.5 rounded border border-border text-text3 hover:text-expense hover:bg-expenseBg hover:border-[#f1c4c4] transition-all"
                                title="Hapus"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activeTab === 'categories') {
      return <CategoriesTab session={session} />;
    }

    if (activeTab === 'transactions') {
      return (
        <TransactionsTab 
          transactions={transactions}
          categories={categories}
          loading={loading}
          onEdit={handleEditTransaction}
          onDelete={handleDeleteTransaction}
          session={session}
        />
      );
    }

    if (activeTab === 'reports') {
      return (
        <ReportsTab 
          transactions={transactions}
          categories={categories}
          loading={loading}
        />
      );
    }

    if (activeTab === 'settings') {
      return (
        <SettingsTab 
          session={session}
          onReset={fetchData}
        />
      );
    }
    
    return (
      <div className="bg-surface rounded-xl border border-border shadow-sm p-4 text-center text-text3">
        Halaman {activeTab} sedang dalam proses migrasi.
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-bg">
      <Sidebar 
        user={session?.user} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
      />
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="bg-surface border-b border-border py-3.5 px-6 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-[15px] font-semibold">{getHeaderInfo().title}</h1>
            <p className="text-[12px] text-text3 mt-0.5">{getHeaderInfo().subtitle}</p>
          </div>
          <div className="flex gap-2">
            <button 
              className="px-4 py-2 bg-textMain text-white rounded-md text-[13px] font-medium transition-colors hover:bg-[#333]"
              onClick={() => {
                setEditingTransaction(null);
                setIsModalOpen(true);
              }}
            >
              + Transaksi Baru
            </button>
          </div>
        </header>
        <div className="p-6">
          {renderContent()}
        </div>
      </main>
      <TransactionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        transaction={editingTransaction} 
        session={session}
        onSuccess={() => {
          fetchData();
          setIsModalOpen(false);
        }}
      />
    </div>
  );
}

function StatCard({ title, value, type }) {
  const getBorderColor = () => {
    switch(type) {
      case 'income': return 'border-t-income';
      case 'expense': return 'border-t-expense';
      case 'balance': return 'border-t-accent';
      case 'txcount': return 'border-t-blueCustom';
      default: return 'border-t-border';
    }
  };

  const getValueColor = () => {
    switch(type) {
      case 'income': return 'text-income';
      case 'expense': return 'text-expense';
      default: return 'text-textMain';
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  const displayValue = type === 'txcount' ? value : formatCurrency(value);

  return (
    <div className={`bg-surface rounded-xl p-4 border border-border shadow-sm relative overflow-hidden border-t-[3px] ${getBorderColor()}`}>
      <div className="text-[10px] text-text3 uppercase tracking-[0.6px] font-semibold mb-1.5">{title}</div>
      <div className={`text-[20px] font-semibold leading-tight font-[tnum] ${getValueColor()}`}>
        {displayValue}
      </div>
    </div>
  );
}
