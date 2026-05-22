import { Link } from '@tanstack/react-router';
import type { User } from '../../types';

interface SidebarProps {
  user: User | null;
  onLogout: () => void;
}

export default function Sidebar({ user, onLogout }: SidebarProps) {
  const navItems = [
    { to: '/', label: 'Dasbor', icon: '📊' },
    { to: '/transactions', label: 'Transaksi', icon: '💸' },
    { to: '/reports', label: 'Laporan', icon: '📈' },
    { to: '/categories', label: 'Kategori', icon: '📑' },
    { to: '/capital', label: 'Modal', icon: '📦' },
    { to: '/settings', label: 'Atur', icon: '⚙️' },
  ] as const;

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
            <Link
              key={item.to}
              to={item.to}
              activeProps={{
                className: 'bg-[rgba(255,255,255,0.12)] text-white font-medium',
              }}
              inactiveProps={{
                className: 'text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.08)] hover:text-white',
              }}
              className="w-full flex items-center gap-2.5 p-2.5 rounded-lg text-[13.5px] mb-0.5 text-left transition-colors"
            >
              <span className="opacity-80">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>

        <div className="p-3.5 px-2.5 border-t border-[rgba(255,255,255,0.08)]">
          <button
            type="button"
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
          <Link
            key={item.to}
            to={item.to}
            activeProps={{
              className: 'text-textMain',
            }}
            inactiveProps={{
              className: 'text-text3 hover:text-text2',
            }}
            className="flex flex-col items-center justify-center p-2 min-w-[56px] flex-1 transition-colors rounded-lg"
          >
            {({ isActive }) => (
              <>
                <span className={`text-[18px] mb-1 ${isActive ? 'opacity-100 grayscale-0' : 'opacity-50 grayscale'}`}>
                  {item.icon}
                </span>
                <span className="text-[9px] font-semibold tracking-tight">{item.label}</span>
              </>
            )}
          </Link>
        ))}
      </nav>
    </>
  );
}
