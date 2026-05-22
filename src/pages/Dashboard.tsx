import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip } from 'chart.js';
import { useEffect, useMemo, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { toast } from 'react-hot-toast';
import Spinner from '../components/atoms/Spinner';
import Sidebar from '../components/layout/Sidebar';
import StatCard from '../components/molecules/StatCard';
import TransactionModal from '../components/templates/TransactionModal';
import TransactionTable from '../components/templates/TransactionTable';
import { useAuth } from '../hooks/useAuth';
import { useCategories } from '../hooks/useCategories';
import { useTransactions } from '../hooks/useTransactions';
import { supabase } from '../lib/supabase';
import type { Session, Transaction } from '../types';
import { formatCurrency } from '../utils/formatters';
import CapitalTab from './CapitalPage';
import CategoriesTab from './CategoriesPage';
import ReportsTab from './ReportsPage';
import SettingsTab from './SettingsPage';
import TransactionsTab from './TransactionsPage';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

interface DashboardProps {
  session: Session | null;
}

export default function Dashboard({ session }: DashboardProps) {
  const isAuthorized = true;
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Stats
  const [stats, setStats] = useState({
    income: 0,
    expense: 0,
    balance: 0,
    txCount: 0,
  });

  const { signOut } = useAuth();
  const { transactions, fetchTransactions } = useTransactions(session);
  const { categories, fetchCategories } = useCategories(session);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchTransactions(), fetchCategories()]);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      toast.error('Gagal memuat data dasbor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [session, fetchTransactions, fetchCategories]);

  useEffect(() => {
    const inc = transactions.filter((t) => t.type === 'pemasukan').reduce((a, t) => a + Number(t.amount), 0);
    const exp = transactions.filter((t) => t.type === 'pengeluaran').reduce((a, t) => a + Number(t.amount), 0);
    setStats({
      income: inc,
      expense: exp,
      balance: inc - exp,
      txCount: transactions.length,
    });
  }, [transactions]);

  // Group Balance by Category
  const balanceByCategory = useMemo(() => {
    const groups: Record<string, number> = {};
    transactions.forEach((t) => {
      if (!groups[t.category]) groups[t.category] = 0;
      if (t.type === 'pemasukan') {
        groups[t.category] += Number(t.amount);
      } else {
        groups[t.category] -= Number(t.amount);
      }
    });
    return Object.entries(groups).sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  // Group Expenses by Category for Doughnut Chart
  const expenseByCategory = useMemo(() => {
    const groups: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'pengeluaran')
      .forEach((t) => {
        groups[t.category] = (groups[t.category] || 0) + Number(t.amount);
      });
    return Object.entries(groups).sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  // Group Monthly Cashflow Data for Bar Chart
  const monthlyCashflow = useMemo(() => {
    const monthlyData: Record<string, { label: string; income: number; expense: number }> = {};
    const chronologicalTx = [...transactions].reverse();

    chronologicalTx.forEach((t) => {
      const date = new Date(t.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[key]) {
        monthlyData[key] = {
          label: date.toLocaleDateString('id-ID', {
            month: 'short',
            year: 'numeric',
          }),
          income: 0,
          expense: 0,
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
      labels: sortedKeys.map((k) => monthlyData[k].label),
      income: sortedKeys.map((k) => monthlyData[k].income),
      expense: sortedKeys.map((k) => monthlyData[k].expense),
    };
  }, [transactions]);

  const handleDeleteTransaction = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) return;
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);

      if (error) throw error;
      toast.success('Transaksi berhasil dihapus!');
      fetchData();
    } catch (error) {
      const err = error as Error;
      toast.error(`Gagal menghapus transaksi: ${err.message}`);
    }
  };

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsModalOpen(true);
  };

  const handleLogout = async () => {
    await signOut();
  };

  const getHeaderInfo = () => {
    switch (activeTab) {
      case 'dashboard':
        return {
          title: 'Beranda',
          subtitle: 'Ringkasan aktivitas keuangan Anda',
        };
      case 'transactions':
        return {
          title: 'Transaksi',
          subtitle: 'Lihat dan kelola seluruh transaksi keuangan Anda',
        };
      case 'reports':
        return {
          title: 'Laporan',
          subtitle: 'Analisis detail pemasukan & pengeluaran Anda',
        };
      case 'categories':
        return {
          title: 'Kategori',
          subtitle: 'Kelola kategori pemasukan & pengeluaran',
        };
      case 'capital':
        return {
          title: 'Rekap Modal',
          subtitle: 'Lacak inventaris, harga modal, dan profit',
        };
      case 'settings':
        return {
          title: 'Pengaturan',
          subtitle: 'Ubah preferensi profil dan akun',
        };
      default:
        return {
          title: 'KasKu - Bhineka Djaya Primasatya',
          subtitle: 'Catatan Keuangan Pribadi',
        };
    }
  };

  const getCategoryEmoji = (type: string, catName: string): string => {
    const found = categories.find((c) => c.name === catName && c.type === type);
    return found ? found.emoji || '📦' : '📦';
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
              <StatCard title="Pemasukan" value={stats.income} variant="income" />
              <StatCard title="Pengeluaran" value={stats.expense} variant="expense" />
              <StatCard title="Sisa Saldo" value={stats.balance} variant="accent" isPrefixDynamic={true} />
              <StatCard
                title="Total Transaksi"
                value={stats.txCount}
                variant="blue"
                formatter={(val) => val.toString()}
              />
            </div>
          </div>

          {/* Charts Visualization Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cashflow Trends (Large Column) */}
            <div className="bg-surface rounded-xl border border-border p-5 shadow-sm md:col-span-2">
              <h3 className="font-bold text-[14px] text-textMain uppercase tracking-[0.6px] mb-4">
                Tren Arus Kas Bulanan
              </h3>
              <div className="h-[240px]">
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Spinner size="lg" />
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
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top',
                          labels: { font: { size: 11 } },
                        },
                      },
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
                    <Spinner size="lg" />
                  </div>
                ) : (
                  <Doughnut
                    data={{
                      labels: expenseByCategory.map(([name]) => name).length
                        ? expenseByCategory.map(([name]) => name)
                        : ['Tidak Ada Pengeluaran'],
                      datasets: [
                        {
                          data: expenseByCategory.map(([, val]) => val).length
                            ? expenseByCategory.map(([, val]) => val)
                            : [1],
                          backgroundColor: [
                            '#3b82f6',
                            '#10b981',
                            '#f59e0b',
                            '#8b5cf6',
                            '#ef4444',
                            '#ec4899',
                            '#14b8a6',
                            '#f43f5e',
                            '#64748b',
                          ].slice(0, Math.max(1, expenseByCategory.length)),
                          borderWidth: 1,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: { boxWidth: 10, font: { size: 10 } },
                        },
                      },
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Balance By Category Section */}
          <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
            <h3 className="font-bold text-[14px] text-textMain uppercase tracking-[0.6px] mb-4">
              Sisa Saldo per Kategori
            </h3>
            {loading ? (
              <div className="flex items-center justify-center p-6">
                <Spinner size="lg" />
              </div>
            ) : balanceByCategory.length === 0 ? (
              <div className="p-6 text-center text-text3 text-[13px]">Belum ada data saldo kategori.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {balanceByCategory.map(([catName, balance]) => {
                  const emoji = getCategoryEmoji('pemasukan', catName); // Hacky fallback since category type isn't guaranteed
                  return (
                    <div
                      key={catName}
                      className="p-3 border border-border rounded-lg bg-surface2 flex items-center justify-between shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[16px]">{emoji}</span>
                        <span
                          className="font-semibold text-[13px] text-textMain truncate max-w-[80px] md:max-w-[100px]"
                          title={catName}
                        >
                          {catName}
                        </span>
                      </div>
                      <span
                        className={`font-bold text-[13px] font-[tnum] ${Number(balance) >= 0 ? 'text-income' : 'text-expense'}`}
                      >
                        {formatCurrency(balance)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Transactions Section */}
          <div className="relative">
            {activeTab === 'dashboard' && (
              <div className="absolute top-5 right-5 z-10">
                <button
                  onClick={() => setActiveTab('transactions')}
                  className="text-[12px] font-semibold text-textMain hover:underline bg-surface px-2 py-1 rounded"
                >
                  Lihat Semua →
                </button>
              </div>
            )}
            <TransactionTable
              title="Transaksi Terbaru"
              transactions={recentTx}
              loading={loading}
              onEdit={handleEditTransaction}
              onDelete={handleDeleteTransaction}
              getCategoryEmoji={getCategoryEmoji}
              pagination={false}
            />
          </div>
        </div>
      );
    }

    if (activeTab === 'transactions')
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
    if (activeTab === 'reports') return <ReportsTab transactions={transactions} loading={loading} />;
    if (activeTab === 'categories') return <CategoriesTab session={session} transactions={transactions} />;
    if (activeTab === 'capital') return <CapitalTab session={session} />;
    if (activeTab === 'settings') return <SettingsTab session={session} />;

    return null;
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="flex h-screen bg-bgBody overflow-hidden selection:bg-textMain/20 selection:text-textMain">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} user={session?.user || null} />

      <main className="flex-1 flex flex-col min-w-0 pb-[80px] md:pb-0 h-full overflow-y-auto overflow-x-hidden">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-xl border-b border-border/80 px-4 md:px-8 py-4">
          <div className="max-w-[1200px] mx-auto w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-[20px] md:text-[24px] font-bold text-textMain leading-tight">{headerInfo.title}</h1>
              <p className="text-[13px] text-text3 mt-0.5">{headerInfo.subtitle}</p>
            </div>

            {isAuthorized && activeTab === 'dashboard' && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setEditingTransaction(null);
                    setIsModalOpen(true);
                  }}
                  className="w-full md:w-auto px-5 py-2.5 bg-textMain hover:bg-[#333] text-white text-[14px] font-semibold rounded-xl shadow-sm transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
                >
                  <span className="text-[18px] leading-none">+</span> Tambah Transaksi
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="p-4 md:p-8 w-full max-w-[1200px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-8">
          {renderContent()}
        </div>
      </main>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        transaction={editingTransaction}
        session={session}
        onSuccess={() => {
          setIsModalOpen(false);
          fetchData();
        }}
      />
    </div>
  );
}
