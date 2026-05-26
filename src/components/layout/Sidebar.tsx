import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import type { User } from '../../types';

interface SidebarProps {
  user: User | null;
  onLogout: () => void;
}

export default function Sidebar({ user, onLogout }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    }
    return false;
  });

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  const navItems = [
    { to: '/', label: 'Dasbor', icon: '📊' },
    { to: '/transactions', label: 'Transaksi', icon: '💸' },
    { to: '/reports', label: 'Laporan', icon: '📈' },
    { to: '/categories', label: 'Kategori', icon: '📑' },
    { to: '/capital', label: 'Modal', icon: '📦' },
    { to: '/settings', label: 'Atur', icon: '⚙️' },
  ] as const;

  const navItemsV2 = [
    { to: '/v2/capital', label: 'Modal V2', icon: '📦' },
    { to: '/v2/suppliers', label: 'Supplier', icon: '🏢' },
    { to: '/v2/invoices', label: 'Nota Transaksi', icon: '🧾' },
    { to: '/v2/reports', label: 'Laporan V2', icon: '📈' },
  ] as const;

  const allMobileItems = [...navItems, ...navItemsV2];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex bg-textMain text-white flex-col sticky top-0 h-screen overflow-y-auto z-50 transition-all duration-300 ${
          isCollapsed ? 'w-[70px] min-w-[70px]' : 'w-[220px] min-w-[220px]'
        }`}
      >
        <div
          className={`p-4 py-5 border-b border-[rgba(255,255,255,0.08)] flex items-center ${
            isCollapsed ? 'justify-center' : 'justify-between gap-2'
          }`}
        >
          {!isCollapsed && (
            <div className="overflow-hidden animate-in fade-in duration-200 flex-1">
              <h1 className="font-serif text-[22px] text-white leading-none">KasKu</h1>
              <div className="text-[9.5px] uppercase tracking-[0.4px] text-[rgba(255,255,255,0.4)] mt-1.5 font-semibold">
                Bhineka Djaya Primasatya
              </div>
              <div className="text-[11px] text-[rgba(255,255,255,0.35)] mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
                {user?.email || 'user@example.com'}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-1 rounded-md bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.15)] transition-colors text-white text-[10px] flex items-center justify-center w-6 h-6 flex-shrink-0"
            title={isCollapsed ? 'Buka Sidebar' : 'Lipat Sidebar'}
          >
            {isCollapsed ? '▶' : '◀'}
          </button>
        </div>

        <div className="p-3.5 px-2.5 flex-1">
          {!isCollapsed ? (
            <div className="text-[10px] uppercase tracking-[1px] text-[rgba(255,255,255,0.3)] font-semibold py-2 px-2.5">
              Menu Utama
            </div>
          ) : (
            <div className="border-t border-[rgba(255,255,255,0.08)] my-2" />
          )}
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
              className={`w-full flex items-center rounded-lg text-[13.5px] mb-0.5 transition-all duration-200 relative group ${
                isCollapsed ? 'justify-center py-2.5 px-0' : 'gap-2.5 p-2.5 text-left'
              }`}
            >
              <span className="opacity-80 text-[16px]">{item.icon}</span>
              {!isCollapsed && <span className="animate-in fade-in duration-200">{item.label}</span>}

              {/* Tooltip Collapsed */}
              {isCollapsed && (
                <div className="absolute left-[76px] bg-textMain text-white text-[11px] font-medium py-1.5 px-2.5 rounded-md shadow-lg opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 pointer-events-none transition-all duration-150 origin-left whitespace-nowrap z-50 border border-[rgba(255,255,255,0.15)] flex items-center">
                  <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[4px] border-t-transparent border-r-[5px] border-r-textMain border-b-[4px] border-b-transparent" />
                  {item.label}
                </div>
              )}
            </Link>
          ))}

          {!isCollapsed ? (
            <div className="text-[10px] uppercase tracking-[1px] text-[rgba(255,255,255,0.3)] font-semibold py-2 px-2.5 mt-4 border-t border-[rgba(255,255,255,0.08)] pt-3">
              Konsep V2
            </div>
          ) : (
            <div className="border-t border-[rgba(255,255,255,0.08)] my-2" />
          )}
          {navItemsV2.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{
                className: 'bg-[rgba(255,255,255,0.12)] text-white font-medium',
              }}
              inactiveProps={{
                className: 'text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.08)] hover:text-white',
              }}
              className={`w-full flex items-center rounded-lg text-[13.5px] mb-0.5 transition-all duration-200 relative group ${
                isCollapsed ? 'justify-center py-2.5 px-0' : 'gap-2.5 p-2.5 text-left'
              }`}
            >
              <span className="opacity-80 text-[16px]">{item.icon}</span>
              {!isCollapsed && <span className="animate-in fade-in duration-200">{item.label}</span>}

              {/* Tooltip Collapsed */}
              {isCollapsed && (
                <div className="absolute left-[76px] bg-textMain text-white text-[11px] font-medium py-1.5 px-2.5 rounded-md shadow-lg opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 pointer-events-none transition-all duration-150 origin-left whitespace-nowrap z-50 border border-[rgba(255,255,255,0.15)] flex items-center">
                  <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[4px] border-t-transparent border-r-[5px] border-r-textMain border-b-[4px] border-b-transparent" />
                  {item.label}
                </div>
              )}
            </Link>
          ))}
        </div>

        <div className="p-3.5 px-2.5 border-t border-[rgba(255,255,255,0.08)]">
          <button
            type="button"
            onClick={onLogout}
            className={`w-full flex items-center rounded-lg text-[13px] text-[rgba(255,255,255,0.5)] transition-all duration-200 relative group hover:bg-[rgba(255,0,0,0.1)] hover:text-[#ff6b6b] ${
              isCollapsed ? 'justify-center py-2.5 px-0' : 'gap-2.5 p-2.5 text-left'
            }`}
          >
            <span className="text-[16px] opacity-80">🚪</span>
            {!isCollapsed && <span className="animate-in fade-in duration-200">Keluar</span>}

            {/* Tooltip Collapsed */}
            {isCollapsed && (
              <div className="absolute left-[76px] bg-textMain text-[#ff6b6b] text-[11px] font-medium py-1.5 px-2.5 rounded-md shadow-lg opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 pointer-events-none transition-all duration-150 origin-left whitespace-nowrap z-50 border border-[rgba(255,255,255,0.15)] flex items-center">
                <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[4px] border-t-transparent border-r-[5px] border-r-textMain border-b-[4px] border-b-transparent" />
                Keluar
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-50 flex justify-between items-center px-1 pb-1 pt-1 overflow-x-auto hide-scrollbar">
        {allMobileItems.map((item) => (
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
