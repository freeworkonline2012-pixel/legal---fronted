'use client';

/**
 * إدارة الوضع الليلي (Dark Mode) — متطلب وصول إلزامي (design_system.md القسم 7).
 *
 * - الاحترام الافتراضي: يتبع prefers-color-scheme عند أول زيارة.
 * - حفظ اختيار المستخدم في localStorage.
 * - يُطبَّق عبر تبديل class `dark` على <html> (Tailwind darkMode: 'class').
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Moon, Sun } from 'lucide-react';

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = 'legal-platform-theme';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    // أولوية للفئة المضبوطة قبل hydration (سكربت التهيئة في layout.tsx) —
    // تطابق فوري بين حالة React والفئة المطبقة على <html> يمنع وميض الوضع الليلي
    // (FOUC) في أول رسم للمستخدم الذي يفضّل dark.
    if (document.documentElement.classList.contains('dark')) return 'dark';
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage غير متاح (وضع خصوصي صارم) — نكمل للتفضيل النظامي
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  // التهيئة بعد التحميل لتجنّب وميض الوضع الفاتح (FOUC) قدر الإمكان.
  useEffect(() => {
    // متعمّد: قراءة حالة وسم <html> (التي ضبطها سكربت التهيئة قبل hydration)
    // و localStorage مصادر خارجية متاحة للعميل فقط؛ التهيئة الكسولة (lazy useState)
    // تسبب عدم تطابق hydration (SSR يرسم 'light' بينما العميل قد يقرأ 'dark').
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(getInitialTheme());
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // تجاهل فشل الحفظ — الوضع يبقى سارياً لهذه الجلسة
    }
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, toggleTheme, setTheme }),
    [theme, toggleTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme يجب أن يُستخدم داخل ThemeProvider');
  }
  return ctx;
}

/** زر تبديل الوضع الليلي — دائماً أيقونة + نص (لا لون وحده — WCAG 1.4.1) */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'الوضع الفاتح' : 'الوضع الليلي';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md px-3 text-body-sm text-text-secondary transition-colors duration-[120ms] hover:bg-surface-muted focus-visible:outline-none"
    >
      {isDark ? (
        <Sun className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Moon className="h-5 w-5" aria-hidden="true" />
      )}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
