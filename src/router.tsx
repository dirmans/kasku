import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  redirect,
  useRouter,
  useRouterState,
} from '@tanstack/react-router';
import Sidebar from './components/layout/Sidebar';
import TransactionModal from './components/templates/TransactionModal';
import { useAppContext } from './context/AppContext';
import { useAuth } from './hooks/useAuth';
// Page imports
import AuthScreen from './pages/AuthScreen';
import CapitalPage from './pages/CapitalPage';
import CategoriesPage from './pages/CategoriesPage';
import Dashboard from './pages/Dashboard';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import TransactionsPage from './pages/TransactionsPage';
import type { Session } from './types';

// 1. Router Context Type
interface MyRouterContext {
  session: Session | null;
  authLoading: boolean;
}

// 2. Root Route
export const rootRoute = createRootRouteWithContext<MyRouterContext>()({
  component: () => <Outlet />,
});

// 3. Login Route (unauthenticated)
export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: ({ context }) => {
    if (context.session) {
      throw redirect({ to: '/' });
    }
  },
  component: AuthScreen,
});

// 4. Authenticated Layout component
function AuthLayout() {
  const { session, isModalOpen, setIsModalOpen, editingTransaction, fetchData, openTransactionModal } = useAppContext();
  const { signOut } = useAuth();
  const router = useRouter();
  const pathname = useRouterState().location.pathname;

  const getHeaderInfo = (path: string) => {
    switch (path) {
      case '/':
        return {
          title: 'Dasbor',
          subtitle: 'Ringkasan aktivitas keuangan Anda',
        };
      case '/transactions':
        return {
          title: 'Transaksi',
          subtitle: 'Lihat dan kelola seluruh transaksi keuangan Anda',
        };
      case '/reports':
        return {
          title: 'Laporan',
          subtitle: 'Analisis detail pemasukan & pengeluaran Anda',
        };
      case '/categories':
        return {
          title: 'Kategori',
          subtitle: 'Kelola kategori pemasukan & pengeluaran',
        };
      case '/capital':
        return {
          title: 'Rekap Modal',
          subtitle: 'Lacak inventaris, harga modal, dan profit',
        };
      case '/settings':
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

  const headerInfo = getHeaderInfo(pathname);

  return (
    <div className="flex h-screen bg-bgBody overflow-hidden selection:bg-textMain/20 selection:text-textMain">
      <Sidebar user={session?.user || null} onLogout={signOut} />

      <main className="flex-1 flex flex-col min-w-0 pb-[80px] md:pb-0 h-full overflow-y-auto overflow-x-hidden">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-xl border-b border-border/80 px-4 md:px-8 py-4">
          <div className="max-w-[1200px] mx-auto w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-[20px] md:text-[24px] font-bold text-textMain leading-tight">{headerInfo.title}</h1>
              <p className="text-[13px] text-text3 mt-0.5">{headerInfo.subtitle}</p>
            </div>

            {['/', '/transactions'].includes(pathname) && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => openTransactionModal()}
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
          <Outlet />
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
          if (!editingTransaction) {
            router.navigate({ to: '/' });
          }
        }}
      />
    </div>
  );
}

// 5. Authenticated Layout Route
export const authLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'auth',
  beforeLoad: ({ context }) => {
    if (!context.session && !context.authLoading) {
      throw redirect({ to: '/login' });
    }
  },
  component: AuthLayout,
});

// 6. Define routes under authLayout
export const indexRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/',
  component: Dashboard,
});

export const transactionsRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/transactions',
  component: TransactionsPage,
});

export const reportsRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/reports',
  component: ReportsPage,
});

export const categoriesRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/categories',
  component: CategoriesPage,
});

export const capitalRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/capital',
  component: CapitalPage,
});

export const settingsRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/settings',
  component: SettingsPage,
});

// 7. Route Tree
const routeTree = rootRoute.addChildren([
  loginRoute,
  authLayoutRoute.addChildren([
    indexRoute,
    transactionsRoute,
    reportsRoute,
    categoriesRoute,
    capitalRoute,
    settingsRoute,
  ]),
]);

// 8. Create Router
export const router = createRouter({
  routeTree,
  context: {
    session: null,
    authLoading: true,
  },
});

// Register router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
