import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

/* ── Icon helpers ─────────────────────────────────────────── */
const Icon = ({ d, cls = '' }) => (
  <svg className={`w-4 h-4 flex-shrink-0 ${cls}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const ICONS = {
  dashboard:    'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  transactions: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  users:        'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  shareholders: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  close:        'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  distributions:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  settings:     'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  logout:       'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  analytics:    'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z',
  moon:         'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
  sun:          'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z',
};

/* ── Nav item ─────────────────────────────────────────────── */
const NavItem = ({ to, icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
        isActive
          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 shadow-sm'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
      }`
    }
  >
    <Icon d={ICONS[icon]} />
    {label}
  </NavLink>
);

/* ── Layout ───────────────────────────────────────────────── */
const Layout = ({ children, title, subtitle }) => {
  const navigate = useNavigate();
  const { user, logout, hasRole } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-900 transition-colors duration-200">
      {/* ── Sidebar ───────────────────────────────────────── */}
      <aside className="sidebar flex flex-col bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 py-6 px-4 gap-1 fixed top-0 left-0 h-full z-20 transition-colors duration-200">
        {/* Brand */}
        <div className="px-3 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-none">ProfitCalc</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Finance Platform</p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-0.5 flex-1">
          <NavItem to="/dashboard" icon="dashboard" label="Dashboard" />

          {(hasRole('DATA_ENTRY') || hasRole('ADMIN')) && (
            <NavItem to="/transactions" icon="transactions" label="Transactions" />
          )}

          {hasRole('ADMIN') && (
            <>
              <NavItem to="/analytics" icon="analytics" label="Analytics" />
              <NavItem to="/close-ledger"  icon="close"         label="Close Month" />
              <NavItem to="/distributions" icon="distributions" label="Distributions" />

              <div className="border-t border-slate-100 dark:border-slate-800 my-2" />

              <NavItem to="/settings" icon="settings" label="Settings" />
            </>
          )}
        </nav>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="mb-2 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <Icon d={isDark ? ICONS.sun : ICONS.moon} />
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </button>

        {/* User pill */}
        <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 transition-colors duration-200">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-300 truncate">{user?.name}</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="mt-2.5 w-full flex items-center justify-center gap-1.5 text-xs font-medium text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/10 dark:text-rose-400 py-1.5 rounded-lg transition-colors"
          >
            <Icon d={ICONS.logout} cls="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main area ─────────────────────────────────────── */}
      <div className="flex-1 ml-[240px] flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-8 py-4 flex items-center justify-between transition-colors duration-200">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h1>
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
            {user?.role}
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 p-8 page-enter text-slate-800 dark:text-slate-200">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
