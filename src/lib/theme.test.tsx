/**
 * اختبارات ThemeProvider — سلوك منع وميض الوضع الليلي (FOUC) — جولة التحصين 9.
 *
 * العقد المغطى (جديد هذه الجولة):
 * - سكربت التهيئة في layout.tsx يضبط فئة `dark` على <html> قبل الـ hydration.
 * - ThemeProvider.getInitialTheme يقرأ تلك الفئة أولاً فيطابق حالته فوراً
 *   (لا وميض فاتح للمستخدم الذي يفضّل dark في أول رسم — CWV/استقرار بصري).
 * - بدون فئة مسبقة: يبقى فاتحاً افتراضياً ولا يضيف dark خطأً.
 * - التبديل اليدوي: يبدّل الفئة على <html> ويحفظ التفضيل في localStorage.
 *
 * ملاحظة: jsdom لا يشغّل سكربت layout.tsx — نضبط الفئة يدوياً لمحاكاة سلوكه.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, ThemeToggle } from './theme';

describe('ThemeProvider — منع FOUC (جولة 9)', () => {
  const originalClassList = document.documentElement.className;

  afterEach(() => {
    document.documentElement.className = originalClassList;
    window.localStorage.clear();
  });

  it('يقرأ فئة dark المضبوطة مسبقاً (محاكاة سكربت ما قبل الـ hydration) ويطابق الحالة فوراً', async () => {
    // محاكاة ما يفعله سكربت layout.tsx قبل hydration
    document.documentElement.classList.add('dark');

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    // بعد التهيئة يطابق المزوّد الفئة → الوضع الحالي ليلي → الزر يعرض «الوضع الفاتح»
    expect(await screen.findByRole('button', { name: 'الوضع الفاتح' })).toBeInTheDocument();
    // لا تُزال الفئة أبداً عند تطابق الحالة — لا وميض
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('بدون فئة مسبقة يبقى فاتحاً ولا يضيف dark خطأً', async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    expect(await screen.findByRole('button', { name: 'الوضع الليلي' })).toBeInTheDocument();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('التبديل اليدوي يبدّل الفئة على <html> ويحفظ التفضيل في localStorage', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    const toggle = await screen.findByRole('button', { name: 'الوضع الليلي' });
    await user.click(toggle);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(window.localStorage.getItem('legal-platform-theme')).toBe('dark');
    expect(screen.getByRole('button', { name: 'الوضع الفاتح' })).toBeInTheDocument();
  });
});
