import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';

import { Toaster } from 'react-hot-toast';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

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
          }
        }}
      />
      {!session ? <AuthScreen /> : <Dashboard session={session} />}
    </>
  );
}

export default App;
