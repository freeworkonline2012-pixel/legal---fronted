/**
 * نظام Toast — إشعارات (component_states.md القسم 11).
 *
 * - الموضع: أعلى الصفحة (وسط)، z-index 400.
 * - Success/Info: تختفي تلقائياً بعد 4 ثوانٍ.
 * - Error: تبقى حتى إغلاق يدوي + لا تختفي تلقائياً (إمكانية وصول).
 * - إغلاق: زر ✕ 44×44 + زر «إغلاق» نصي.
 */

'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import type { ToastKind } from '@/lib/types';

interface ToastMessage {
  id: string;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  showToast: (kind: ToastKind, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const KIND_ICONS: Record<ToastKind, ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />,
  error: <AlertCircle className="h-5 w-5 text-error" aria-hidden="true" />,
  info: <Info className="h-5 w-5 text-primary" aria-hidden="true" />,
};

const AUTO_DISMISS_MS: Record<ToastKind, number> = {
  success: 4000,
  info: 4000,
  error: 0, // لا تختفي تلقائياً
};

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  // عند إزالة ToastProvider من الشجرة (نهاية اختبار/تنقّل) نُفرّغ كل مؤقّتات
  // الإخفاء التلقائي — يمنع تسريب مؤقّتات في التطبيق الفعلي وتحديثات حالة
  // خارج act() في الاختبارات (T-TEST-HYGIENE-1).
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const showToast = useCallback(
    (kind: ToastKind, message: string) => {
      const id = `toast-${++toastCounter}`;
      setToasts((prev) => [...prev, { id, kind, message }]);
      const duration = AUTO_DISMISS_MS[kind];
      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timersRef.current.set(id, timer);
      }
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-4 z-toast flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.kind === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-lg border px-4 py-3 shadow-lg ${
              toast.kind === 'success'
                ? 'border-success bg-success-soft'
                : toast.kind === 'error'
                  ? 'border-error bg-error-soft'
                  : 'border-primary-border bg-primary-soft'
            }`}
          >
            <div className="flex items-center gap-2">
              {KIND_ICONS[toast.kind]}
              <p className="text-body-sm text-text-primary">{toast.message}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="إغلاق الإشعار"
                onClick={() => dismiss(toast.id)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md text-text-secondary hover:bg-surface focus-visible:outline-none"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="hidden text-body-sm font-medium text-link hover:text-primary-hover focus-visible:outline-none sm:inline-flex sm:min-h-[44px] sm:items-center"
              >
                إغلاق
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast يجب أن يُستخدم داخل ToastProvider');
  }
  return ctx;
}
