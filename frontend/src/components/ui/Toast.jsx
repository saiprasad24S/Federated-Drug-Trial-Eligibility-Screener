import React, { memo, useState, useCallback, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ToastContext = createContext(null);

const ICONS = {
  success: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  ),
};

const STYLES = {
  success: { bg: 'var(--status-success-bg)', border: 'var(--status-success-border)', text: 'var(--status-success)' },
  error:   { bg: 'var(--status-error-bg)',   border: 'var(--status-error-border)',   text: 'var(--status-error)' },
  info:    { bg: 'var(--status-info-bg)',     border: 'var(--status-info-border)',     text: 'var(--status-info)' },
  warning: { bg: 'var(--status-warning-bg)', border: 'var(--status-warning-border)', text: 'var(--status-warning)' },
};

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    if (duration > 0) setTimeout(() => removeToast(id), duration);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        <AnimatePresence>
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

const ToastItem = memo(function ToastItem({ toast, onClose }) {
  const s = STYLES[toast.type] || STYLES.info;
  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.96 }}
      transition={{ duration: 0.25 }}
      className="glass-card flex items-start gap-3 p-3 pr-10 relative"
      style={{ background: s.bg, borderColor: s.border }}
      role="alert"
    >
      <span style={{ color: s.text }} className="flex-shrink-0 mt-0.5">{ICONS[toast.type]}</span>
      <p className="text-sm font-medium" style={{ color: s.text }}>{toast.message}</p>
      <button
        onClick={onClose}
        className="absolute top-2 right-2 p-1 rounded-full hover:opacity-70"
        style={{ color: s.text }}
        aria-label="Dismiss"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </motion.div>
  );
});

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
