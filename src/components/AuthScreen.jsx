import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthScreen() {
  const isLocal = true;
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name }
          }
        });
        if (signUpError) throw signUpError;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-textMain">
      <div className="bg-surface rounded-2xl p-10 w-[400px] max-w-[95vw] shadow-[0_24px_64px_rgba(0,0,0,0.25)]">
        <div className="font-serif text-[28px] mb-1">KasKu</div>
        <div className="text-[13px] text-text3 mb-7">Catatan keuangan pribadi</div>
        
        {isLocal && (
          <div className="grid grid-cols-2 gap-1 bg-surface2 rounded-lg p-1 mb-6">
            <button 
              className={`p-2 rounded-md text-[13px] font-medium transition-all ${isLogin ? 'bg-surface text-textMain shadow-[0_1px_3px_rgba(0,0,0,0.1)]' : 'text-text2 bg-transparent'}`}
              onClick={() => setIsLogin(true)}
            >
              Masuk
            </button>
            <button 
              className={`p-2 rounded-md text-[13px] font-medium transition-all ${!isLogin ? 'bg-surface text-textMain shadow-[0_1px_3px_rgba(0,0,0,0.1)]' : 'text-text2 bg-transparent'}`}
              onClick={() => setIsLogin(false)}
            >
              Daftar
            </button>
          </div>
        )}

        {error && (
          <div className="bg-expenseBg text-expense border border-[#f1c4c4] rounded-lg p-3 text-[13px] mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="mb-4">
              <label className="block text-[12px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">Nama Lengkap</label>
              <input
                type="text"
                className="w-full p-2.5 border border-border rounded-lg bg-surface2 text-textMain text-[14px] outline-none transition-colors focus:border-textMain focus:bg-surface"
                placeholder="Nama Anda"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!isLogin}
              />
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-[12px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">Email</label>
            <input
              type="email"
              className="w-full p-2.5 border border-border rounded-lg bg-surface2 text-textMain text-[14px] outline-none transition-colors focus:border-textMain focus:bg-surface"
              placeholder="email@contoh.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-[12px] font-semibold text-text2 mb-1.5 uppercase tracking-[0.4px]">Password {(!isLogin) && '(min 6 karakter)'}</label>
            <input
              type="password"
              className="w-full p-2.5 border border-border rounded-lg bg-surface2 text-textMain text-[14px] outline-none transition-colors focus:border-textMain focus:bg-surface"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={isLogin ? undefined : 6}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full p-3 rounded-lg border border-textMain bg-textMain text-white text-[14px] font-medium inline-flex items-center justify-center gap-1.5 transition-all hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Memproses...' : (isLogin ? 'Masuk' : 'Buat Akun')}
          </button>
        </form>
      </div>
    </div>
  );
}
