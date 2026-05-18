import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TransactionModal from './TransactionModal';
import { supabase } from '../lib/supabase';

export default function Dashboard({ session }) {
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const renderContent = () => {
    if (activeTab === 'dashboard') {
      return (
        <div>
          <h2 className="text-[20px] font-semibold mb-4">Ringkasan</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatCard title="Pemasukan" value={stats.income} type="income" />
            <StatCard title="Pengeluaran" value={stats.expense} type="expense" />
            <StatCard title="Sisa Saldo" value={stats.balance} type="balance" />
            <StatCard title="Transaksi" value={stats.txCount} type="txcount" />
          </div>
          {/* Charts and Tables will go here */}
          <div className="bg-surface rounded-xl border border-border shadow-sm p-4 text-center text-text3">
            Komponen dasbor sedang dalam proses migrasi.
          </div>
        </div>
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
            <h1 className="text-[15px] font-semibold">Beranda</h1>
            <p className="text-[12px] text-text3 mt-0.5">Ringkasan aktivitas keuangan Anda</p>
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
