import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate                = useNavigate();
  const { login, error: authError } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const success = await login(email, password);
    setLoading(false);
    if (success) navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* ── Decorative Background Glows for the Glass Effect ── */}
      <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center opacity-60 dark:opacity-30">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-500 rounded-full mix-blend-multiply filter blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-rose-500 rounded-full mix-blend-multiply filter blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] bg-emerald-500 rounded-full mix-blend-multiply filter blur-[100px] animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        
        {/* ── Liquid Glass Card ── */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/60 dark:border-slate-700/50 rounded-[2.5rem] shadow-2xl shadow-indigo-500/10 dark:shadow-none p-10 transition-all duration-300">
          
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/30 border border-white/20">
              <svg className="w-8 h-8 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight mb-1">ProfitCalc</h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Secure Finance & Distribution</p>
          </div>

          {/* Error */}
          {authError && (
            <div className="mb-6 flex items-start gap-3 bg-rose-500/10 backdrop-blur-md border border-rose-500/20 rounded-2xl px-4 py-3">
              <svg className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 leading-relaxed">{authError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 pl-1">Email Address</label>
              <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="admin@percentagecalc.com"
                className="w-full px-4 py-3.5 text-sm font-semibold border border-white/40 dark:border-slate-700/50 rounded-2xl bg-white/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 focus:bg-white/80 dark:focus:bg-slate-900/80 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none shadow-inner"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 pl-1">Password</label>
              <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                className="w-full px-4 py-3.5 text-sm font-semibold border border-white/40 dark:border-slate-700/50 rounded-2xl bg-white/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 focus:bg-white/80 dark:focus:bg-slate-900/80 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none shadow-inner"
              />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-4 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-2xl shadow-lg shadow-indigo-500/30 dark:shadow-indigo-900/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 mt-4 border border-white/10"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : 'Sign In Securely'}
            </button>
          </form>

          {/* Demo Credentials Section */}
          <div className="mt-8 pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 text-center">Fast Login (Demo)</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Admin',      email: 'admin@percentagecalc.com', color: 'indigo' },
                { label: 'Data Entry', email: 'dataentry@example.com',    color: 'emerald' },
              ].map(c => (
                <button key={c.email} type="button"
                  onClick={() => { setEmail(c.email); setPassword('admin123'); }}
                  className="flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-xl border border-white/40 dark:border-slate-700/50 bg-white/30 dark:bg-slate-800/30 hover:bg-white/60 dark:hover:bg-slate-700/50 transition-all group"
                >
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{c.label}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 group-hover:bg-indigo-500 transition-colors" />
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;