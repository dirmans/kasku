import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import AuthScreen from './pages/AuthScreen';
import Dashboard from './pages/Dashboard';

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
    <>
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
      {!session ? <AuthScreen /> : <Dashboard session={session} />}
    </>
  );
}

export default App;
