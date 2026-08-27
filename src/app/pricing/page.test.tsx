/**
 * اختبارات صفحة خطط الاشتراك والدفع (S-07 في wireframes + F-09).
 *
 * تغطي:
 * - عرض الخطط الثلاث (تجربة مجانية / شهرية / سنوية) بأسمائها وأسعارها.
 * - الخطة الشهرية المميزة (highlighted): تُعرض بشارة «الأكثر طلباً» إن وُجدت
 *   وبأزرار CTA لكل خطة.
 * - كل زر CTA يوجّه إلى /login?mode=signup (قرار مالك معلّق: الربط الفعلي
 *   ببوابة الدفع Paymob/Fawry ضمن Phase 3).
 * - إخلاء المسؤولية (P7): نص إخلاء المسؤولية ظاهر في تذييل الصفحة (Footer).
 *
 * ⚠️ الصفحة تعرض <Header /> الذي يستدعي useTheme() وuseToast() — لذلك يجب
 * لفّها بـ ThemeProvider + ToastProvider (نفس نمط Header.test.tsx).
 */

import { render, screen } from '@testing-library/react';
import PricingPage from './page';
import { ToastProvider } from '@/components/ui/Toast';
import { ThemeProvider } from '@/lib/theme';

function renderPage() {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <PricingPage />
      </ToastProvider>
    </ThemeProvider>,
  );
}

describe('PricingPage (S-07)', () => {
  it('يعرض العنوان الرئيسي ووصف الخطط', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'خطط بسيطة، بلا مفاجآت' })).toBeInTheDocument();
    expect(screen.getByText(/الدفع بوسائل مصرية محلية/)).toBeInTheDocument();
  });

  it('يعرض الخطط الثلاث بأسمائها وأسعارها', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'تجربة مجانية' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'الخطة الشهرية' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'الخطة السنوية' })).toBeInTheDocument();

    expect(screen.getByText('0 ج.م')).toBeInTheDocument();
    expect(screen.getByText('99 ج.م')).toBeInTheDocument();
    expect(screen.getByText('899 ج.م')).toBeInTheDocument();
  });

  it('الخطة الشهرية (المميزة) تعرض مزايا إضافية وشارة الأولوية', () => {
    renderPage();
    // مزايا خاصة بالخطة الشهرية فقط
    expect(screen.getByText('أولوية في المراجعة البشرية')).toBeInTheDocument();
    expect(screen.getByText('تصدير البيانات (151/2020)')).toBeInTheDocument();
  });

  it('كل أزرار CTA للخطط الثلاث توجّه إلى /login?mode=signup (قرار مالك: الدفع في Phase 3)', () => {
    renderPage();
    const ctaLinks = screen.getAllByRole('link', { name: /ابدأ التجربة|اشترك شهرياً|اشترك سنوياً/ });
    expect(ctaLinks).toHaveLength(3);
    for (const link of ctaLinks) {
      expect(link).toHaveAttribute('href', '/login?mode=signup');
    }
  });

  it('يعرض ملاحظة الأسعار الاسترشادية وإخلاء المسؤولية في التذييل (P7)', () => {
    renderPage();
    expect(screen.getByText(/الأسعار استرشادية للمرحلة الأولى/)).toBeInTheDocument();
    expect(screen.getByText(/معلومة قانونية موثّقة بالمصدر، وليس استشارة قانونية/)).toBeInTheDocument();
  });
});
