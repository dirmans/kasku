import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;

    // Set a safety timeout to ensure the app doesn't hang on the loading spinner forever
    const safetyTimeout = setTimeout(() => {
      if (active) {
        console.warn('Auth session initialization timed out. Forcing loading to false.');
        setLoading(false);
      }
    }, 4000);

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (active) {
          setSession(session);
        }
      })
      .catch((error) => {
        console.error('Error getting session:', error);
      })
      .finally(() => {
        if (active) {
          clearTimeout(safetyTimeout);
          setLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setSession(session);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email: string, password: string, name: string) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name },
      },
    });
  };

  const signOut = async () => {
    return await supabase.auth.signOut();
  };

  const updatePassword = async (password: string) => {
    return await supabase.auth.updateUser({ password });
  };

  return { session, loading, signIn, signUp, signOut, updatePassword };
}
