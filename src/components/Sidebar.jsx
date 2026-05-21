export default function Sidebar({ user, activeTab, setActiveTab, onLogout }) {
  const navItems = [
    { id: 'dashboard', label: 'Dasbor', icon: '📊' },
    { id: 'transactions', label: 'Transaksi', icon: '💸' },
    { id: 'reports', label: 'Laporan', icon: '📈' },
    { id: 'categories', label: 'Kategori', icon: '📑' },
    { id: 'capital', label: 'Rekap Modal', icon: '📦' },
    { id: 'settings', label: 'Pengaturan', icon: '⚙️' },
  ];

  return (
    <aside className="w-full md:w-[220px] md:min-w-[220px] bg-textMain text-white flex flex-col md:sticky md:top-0 h-auto md:h-screen overflow-y-auto">
      <div className="p-6 pb-4 border-b border-[rgba(255,255,255,0.08)] flex justify-between items-center md:block">
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
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg text-[13.5px] mb-0.5 text-left transition-colors
              ${activeTab === item.id 
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
  );
}
