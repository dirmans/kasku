import { RouterProvider } from '@tanstack/react-router';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from './context/AppContext';
import { useAuth } from './hooks/useAuth';
import { router } from './router';

function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg text-textMain">
        <div className="w-7 h-7 border-4 border-border border-t-textMain rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AppProvider>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#ffffff',
            color: '#111111',
            fontSize: '13px',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          },
        }}
      />
      <RouterProvider router={router} context={{ session, authLoading: loading }} />
    </AppProvider>
  );
}

export default App;
