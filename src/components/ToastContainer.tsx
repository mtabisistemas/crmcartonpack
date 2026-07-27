'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import type { Toast, ToastType } from '../services/toast-service';

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handleAddToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type: ToastType }>;
      const { message, type } = customEvent.detail;
      const id = Math.random().toString(36).substring(2, 9);
      
      const newToast: Toast = { id, message, type };
      setToasts(prev => [...prev, newToast]);

      // Auto remove after 4 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    };

    window.addEventListener('cp-toast-add', handleAddToast);
    return () => window.removeEventListener('cp-toast-add', handleAddToast);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[1000000] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        const bgClass = 
          toast.type === 'success' ? 'bg-[#18181B]/95 border-emerald-500/30 text-emerald-400' :
          toast.type === 'warning' ? 'bg-[#18181B]/95 border-amber-500/30 text-amber-400' :
          toast.type === 'error' ? 'bg-[#18181B]/95 border-rose-500/30 text-rose-400' :
          'bg-[#18181B]/95 border-zinc-800 text-zinc-300';
          
        const Icon = 
          toast.type === 'success' ? CheckCircle2 :
          toast.type === 'warning' ? AlertTriangle :
          toast.type === 'error' ? XCircle : Info;

        return (
          <div
            key={toast.id}
            className={`p-4 rounded-xl border backdrop-blur-md shadow-2xl flex items-start gap-3 pointer-events-auto transition-all duration-300 animate-slide-in ${bgClass}`}
            style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.6)' }}
          >
            <Icon size={18} className="mt-0.5 shrink-0" />
            <div className="flex-1 text-xs font-semibold leading-relaxed">
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
