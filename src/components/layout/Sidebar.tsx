import type { User } from '../../types';

interface SidebarProps {
  user: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export default function Sidebar({ user, activeTab, setActiveTab, onLogout }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dasbor', icon: '📊' },
    { id: 'transactions', label: 'Transaksi', icon: '💸' },
    { id: 'reports', label: 'Laporan', icon: '📈' },
    { id: 'categories', label: 'Kategori', icon: '📑' },
    { id: 'capital', label: 'Modal', icon: '📦' },
    { id: 'settings', label: 'Atur', icon: '⚙️' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[220px] min-w-[220px] bg-textMain text-white flex-col sticky top-0 h-screen overflow-y-auto z-50">
        <div className="p-6 pb-4 border-b border-[rgba(255,255,255,0.08)]">
          <div>
            <h1 className="font-serif text-[22px] text-white leading-none">KasKu</h1>
            <div className="text-[9.5px] uppercase tracking-[0.4px] text-[rgba(255,255,255,0.4)] mt-1.5 font-semibold">
              Bhineka Djaya Primasatya
            </div>
            <div className="text-[11px] text-[rgba(255,255,255,0.35)] mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
              {user?.email || 'user@example.com'}
            </div>
          </div>
        </div>

        <div className="p-3.5 px-2.5 flex-1">
          <div className="text-[10px] uppercase tracking-[1px] text-[rgba(255,255,255,0.3)] font-semibold py-2 px-2.5">
            Menu Utama
          </div>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg text-[13.5px] mb-0.5 text-left transition-colors
                ${
                  activeTab === item.id
                    ? 'bg-[rgba(255,255,255,0.12)] text-white font-medium'
                    : 'text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.08)] hover:text-white'
                }`}
            >
              <span className="opacity-80">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        <div className="p-3.5 px-2.5 border-t border-[rgba(255,255,255,0.08)]">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 p-2.5 rounded-lg text-[13px] text-[rgba(255,255,255,0.5)] text-left transition-colors hover:bg-[rgba(255,0,0,0.1)] hover:text-[#ff6b6b]"
          >
            <span>🚪</span>
            Keluar
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-50 flex justify-between items-center px-1 pb-1 pt-1 overflow-x-auto hide-scrollbar">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center p-2 min-w-[56px] flex-1 transition-colors rounded-lg ${
              activeTab === item.id ? 'text-textMain' : 'text-text3 hover:text-text2'
            }`}
          >
            <span
              className={`text-[18px] mb-1 ${activeTab === item.id ? 'opacity-100 grayscale-0' : 'opacity-50 grayscale'}`}
            >
              {item.icon}
            </span>
            <span className="text-[9px] font-semibold tracking-tight">{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
