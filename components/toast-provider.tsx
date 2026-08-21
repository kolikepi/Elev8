'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertCircle, Info, X, ShoppingBag } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'cart';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

const iconMap: Record<ToastType, ReactNode> = {
  success: <Check size={16} strokeWidth={3} />,
  error: <AlertCircle size={16} />,
  info: <Info size={16} />,
  cart: <ShoppingBag size={16} />,
};

const accentMap: Record<ToastType, string> = {
  success: 'bg-[#32FF6A]',
  error: 'bg-red-500',
  info: 'bg-white/80',
  cart: 'bg-[#32FF6A]',
};

const iconColorMap: Record<ToastType, string> = {
  success: 'text-black',
  error: 'text-white',
  info: 'text-black',
  cart: 'text-black',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success', duration = 3000) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container */}
      <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 pointer-events-none w-full max-w-sm">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto"
            >
              <div className="flex items-center gap-3 bg-[#111] border border-white/10 rounded-lg px-4 py-3 shadow-2xl shadow-black/50 backdrop-blur-sm">
                {/* Icon pill */}
                <div className={`flex-shrink-0 w-7 h-7 rounded-full ${accentMap[toast.type]} flex items-center justify-center`}>
                  <span className={iconColorMap[toast.type]}>{iconMap[toast.type]}</span>
                </div>

                {/* Message */}
                <p className="text-[13px] text-white/90 flex-1 leading-snug">
                  {toast.message}
                </p>

                {/* Close */}
                <button
                  onClick={() => removeToast(toast.id)}
                  className="flex-shrink-0 text-white/30 hover:text-white/60 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
