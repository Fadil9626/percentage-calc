import React from 'react';

const Modal = ({ isOpen, title, children, onClose, onConfirm, confirmText = 'Confirm', confirmColor = 'danger', cancelText }) => {
  if (!isOpen) return null;

  // Upgraded button styles with gradients and glowing shadows
  const confirmStyles = {
    danger: 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-lg shadow-rose-500/20 border border-rose-400/20',
    primary: 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/20 border border-indigo-400/20',
    success: 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/20 border border-emerald-400/20',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Darkened blur backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Liquid Glass Panel */}
      <div className="relative w-full max-w-md bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl rounded-[1.5rem] shadow-2xl shadow-indigo-500/10 dark:shadow-none overflow-hidden border border-white/60 dark:border-slate-700/50 animate-modal-in transform transition-all">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/40 dark:border-slate-700/50 bg-white/40 dark:bg-slate-800/40">
          <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">{title}</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Body */}
        <div className="px-6 py-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {children}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-white/40 dark:bg-slate-800/40 border-t border-white/40 dark:border-slate-700/50">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50 border border-white/50 dark:border-slate-700/50 rounded-xl hover:bg-white/80 dark:hover:bg-slate-700/50 transition-all shadow-sm"
          >
            {cancelText ?? (onConfirm ? 'Cancel' : 'OK')}
          </button>
          {onConfirm && (
            <button
              onClick={onConfirm}
              className={`px-5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all hover:-translate-y-0.5 ${confirmStyles[confirmColor] || confirmStyles.danger}`}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;