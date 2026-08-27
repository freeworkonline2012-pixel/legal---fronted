/**
 * اختبارات صفحة الهبوط (S-01 في wireframes.md — أولوية UX #9/P8).
 *
 * تغطي:
 * - العناصر الأساسية: العنوان، النص التوضيحي، حقل السؤال، زر «اسأل».
 * - المثال الحي (P8): سؤال → إجابة موثّقة → بطاقة مادة → زر «افتح النص الرسمي».
 * - «لماذا تثق بنا؟» + «المجالات المتاحة» (المجالات الخمسة).
 * - إخلاء المسؤولية ظاهر في التذييل (P7).
 *
 * ⚠️ الصفحة تعرض <Header /> الذي يستدعي useTheme() وuseToast() — يجب لفّها
 * بـ ThemeProvider + ToastProvider (نفس نمط Header.test.tsx).
 */

import { render, screen } from '@testing-library/react';
import HomePage from './page';
import { ToastProvider } from '@/components/ui/Toast';
import { ThemeProvider } from '@/lib/theme';

// LandingQuestionForm تستدعي useRouter() (للانتقال إلى /chat?q=) — نحتاج
// mock لنفس نمط LandingQuestionForm.test.tsx (Jest يسمح بالإشارة لمتغيرات
// تبدأ بـ mock داخل factory دالة jest.mock).
const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

function renderPage() {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <HomePage />
      </ToastProvider>
    </ThemeProvider>,
  );
}

describe('HomePage (S-01 Landing)', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('يعرض العنوان الرئيسي والنص التوضيحي وحقل السؤال', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /إجابتك القانونية/ })).toBeInTheDocument();
    expect(screen.getByText(/اسأل بالعامية أو الفصحى/)).toBeInTheDocument();
    // حقل السؤال (LandingQuestionForm) + زر الإرسال
    expect(screen.getByRole('textbox', { name: /سؤالك القانوني/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /اسأل/ })).toBeInTheDocument();
  });

  it('يعرض المثال الحي (P8): السؤال + الإجابة + بطاقة المادة + رابط النص الرسمي', () => {
    renderPage();
    expect(screen.getByText(/اتنفصلت من الشغل من غير إشعار/)).toBeInTheDocument();
    // بطاقة المادة: اسم القانون + رقم المادة + حالة النفاذ (النمط الكامل داخل
    // البطاقة «قانون العمل 12/2003 — مادة 110» — فريد لأن الإجابة المبسطة
    // تصيغها «قانون العمل رقم 12 لسنة 2003» و«المادة 110» بصيغتين مختلفتين)
    expect(screen.getByText(/قانون العمل\s+12\s*\/\s*2003\s*—\s*مادة\s*110/)).toBeInTheDocument();
    expect(screen.getByText('سارية')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /افتح النص الرسمي/ })).toBeInTheDocument();
  });

  it('يعرض قسم «لماذا تثق بنا؟» بنقاط الثقة الأربع', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'لماذا تثق بنا؟' })).toBeInTheDocument();
    expect(screen.getByText('استشهاد متحقق آلياً')).toBeInTheDocument();
    expect(screen.getByText('نرفض بدل التخمين')).toBeInTheDocument();
    expect(screen.getByText('تتبع تعديلات القوانين')).toBeInTheDocument();
    expect(screen.getByText(/خصوصية وفق 151\/2020/)).toBeInTheDocument();
  });

  it('يعرض المجالات الخمسة المتاحة', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'المجالات المتاحة' })).toBeInTheDocument();
    expect(screen.getByText('قانون العمل')).toBeInTheDocument();
    expect(screen.getByText('الإيجارات')).toBeInTheDocument();
    expect(screen.getByText('الأحوال الشخصية')).toBeInTheDocument();
    expect(screen.getByText('قانون المرور')).toBeInTheDocument();
    expect(screen.getByText('حماية المستهلك')).toBeInTheDocument();
  });

  it('يعرض إخلاء المسؤولية في التذييل (P7)', () => {
    renderPage();
    expect(screen.getByText(/معلومة قانونية موثّقة بالمصدر، وليس استشارة قانونية/)).toBeInTheDocument();
  });
});
