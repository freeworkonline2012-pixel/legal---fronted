/**
 * اختبارات صفحة «أسئلتي» (S-08 + F-15 + حقوق 151/2020).
 *
 * تغطي (أول تغطية اختبارية لصفحة /my-questions):
 * - حالة التحميل (Skeleton + نص لقارئ الشاشة) أثناء الجلب المعلّق.
 * - عدم المصادقة (401): رسالة «سجّل الدخول أولاً» بدل خطأ عام.
 * - المعاينة التجريبية بعد فشل اتصال: بيانات DEMO_HISTORY + بانر تحذيري صريح.
 * - حذف سؤال (F-14): مودال تأكيد → DELETE /api/questions/{id} → إزالة العنصر +
 *   إشعار نجاح + الحالة الفارغة (لا طريق مسدود).
 * - فشل الحذف (403/شبكة): يُبقي العنصر ويعرض خطأً صريحاً (role=alert).
 * - في وضع المعاينة التجريبية: حذف محلي دون استدعاء backend.
 *
 * ⚠️ الصفحة تعرض <Header /> (useTheme + useToast) و<BottomNav /> (usePathname)
 * — لذلك نلف بـ ThemeProvider + ToastProvider ونمحّي next/navigation
 * (نفس نمط BottomNav.test.tsx وHeader.test.tsx).
 */

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyQuestionsPage from './page';
import { ToastProvider } from '@/components/ui/Toast';
import { ThemeProvider } from '@/lib/theme';
import { deleteQuestion, fetchQuestionHistory } from '@/lib/api-client';
import { DEMO_HISTORY } from '@/lib/demo-data';
import type { QuestionHistoryResponse } from '@/lib/types';

const mockUsePathname = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

jest.mock('@/lib/api-client', () => ({
  fetchQuestionHistory: jest.fn(),
  deleteQuestion: jest.fn(),
  logoutUser: jest.fn(),
}));

const mockedFetchQuestionHistory = fetchQuestionHistory as jest.MockedFunction<
  typeof fetchQuestionHistory
>;
const mockedDeleteQuestion = deleteQuestion as jest.MockedFunction<typeof deleteQuestion>;

function renderPage() {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <MyQuestionsPage />
      </ToastProvider>
    </ThemeProvider>,
  );
}

describe('MyQuestionsPage', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/my-questions');
    mockedFetchQuestionHistory.mockReset();
    mockedDeleteQuestion.mockReset();
  });

  it('يعرض حالة التحميل أثناء الجلب ثم قائمة الأسئلة', async () => {
    let resolveFetch!: (value: QuestionHistoryResponse) => void;
    mockedFetchQuestionHistory.mockImplementation(
      () =>
        new Promise<QuestionHistoryResponse>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    renderPage();

    // حالة التحميل تظهر فوراً (نص sr-only داخل Skeleton)
    expect(screen.getByText(/جارٍ تحميل أسئلتك/)).toBeInTheDocument();

    // حلّ الوعد داخل act لتجنّب تحذير React 18 (تحديث حالة خارج act)
    await act(async () => {
      resolveFetch({
        items: [
          {
            id: 'q-1',
            question: 'اتنفصلت من الشغل من غير إشعار، ليا حق تعويض؟',
            category: 'labor',
            refused: false,
            confidence: 0.92,
            created_at: '2026-08-17T10:24:00.000Z',
          },
        ],
        total: 1,
      });
    });

    expect(await screen.findByText('اتنفصلت من الشغل من غير إشعار، ليا حق تعويض؟')).toBeInTheDocument();
    // تختفي حالة التحميل
    expect(screen.queryByText(/جارٍ تحميل أسئلتك/)).not.toBeInTheDocument();
  });

  it('يعرض «سجّل الدخول أولاً» عند استجابة 401 (لا خطأ عام)', async () => {
    mockedFetchQuestionHistory.mockRejectedValue(new Error('فشل طلب الخلفية (HTTP 401)'));
    renderPage();

    const title = await screen.findByText(/سجّل الدخول أولاً/);
    expect(title).toBeInTheDocument();
    // زر الانتقال لتسجيل الدخول — نطاق البحث داخل بطاقة EmptyState تحديداً
    // (الهيدر يعرض رابط "تسجيل الدخول" أيضاً بعد تفعيل showAuth افتراضياً
    // فى كل الصفحات 2026-09-05، فاستعلام غير مقيَّد يجد عنصرين).
    const emptyStateCard = title.closest('div');
    expect(emptyStateCard).not.toBeNull();
    expect(
      within(emptyStateCard as HTMLElement).getByRole('link', { name: 'تسجيل الدخول' }),
    ).toBeInTheDocument();
  });

  it('يعرض معاينة تجريبية صريحة عند فشل الاتصال (بانر تحذيري + بيانات تجريبية)', async () => {
    const user = userEvent.setup();
    mockedFetchQuestionHistory.mockRejectedValue(new Error('network down'));
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'عرض معاينة تجريبية' }));

    // بيانات تجريبية تظهر
    expect(screen.getByText(DEMO_HISTORY[0].question)).toBeInTheDocument();
    // بانر تحذيري صريح — لا تُعرض كبيانات حقيقية
    expect(screen.getByText(/تعرض بيانات تجريبية للمعاينة فقط/)).toBeInTheDocument();
  });

  it('يحذف سؤالاً عبر مودال التأكيد → DELETE /questions/{id} ثم يعرض الحالة الفارغة', async () => {
    const user = userEvent.setup();
    mockedFetchQuestionHistory.mockResolvedValue({
      items: [
        {
          id: 'q-1',
          question: 'سؤال سيُحذف نهائياً',
          category: 'labor',
          refused: false,
          confidence: 0.92,
          created_at: '2026-08-17T10:24:00.000Z',
        },
      ],
      total: 1,
    });
    mockedDeleteQuestion.mockResolvedValue({ success: true });
    renderPage();

    await screen.findByText('سؤال سيُحذف نهائياً');

    // فتح مودال التأكيد
    await user.click(screen.getByRole('button', { name: /حذف السؤال: سؤال سيُحذف نهائياً/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // تأكيد الحذف — يُستدعى backend DELETE /api/questions/{id} (F-14)
    await user.click(screen.getByRole('button', { name: 'حذف نهائي' }));
    await waitFor(() => {
      expect(mockedDeleteQuestion).toHaveBeenCalledWith('q-1');
    });
    await waitFor(() => {
      expect(screen.queryByText('سؤال سيُحذف نهائياً')).not.toBeInTheDocument();
    });

    // إشعار نجاح (role=status) + الحالة الفارغة مع إجراء واحد واضح (لا طريق مسدود)
    expect(screen.getByRole('status')).toHaveTextContent('تم حذف السؤال.');
    expect(screen.getByText(/لا توجد أسئلة بعد/)).toBeInTheDocument();
  });

  it('عند فشل حذف backend (شبكة/403) يُبقي العنصر ويعرض خطأً واضحاً', async () => {
    const user = userEvent.setup();
    mockedFetchQuestionHistory.mockResolvedValue({
      items: [
        {
          id: 'q-1',
          question: 'سؤال لن يُحذف',
          category: 'labor',
          refused: false,
          confidence: 0.92,
          created_at: '2026-08-17T10:24:00.000Z',
        },
      ],
      total: 1,
    });
    mockedDeleteQuestion.mockRejectedValue(new Error('فشل طلب الخلفية (HTTP 403)'));
    renderPage();

    await screen.findByText('سؤال لن يُحذف');

    await user.click(screen.getByRole('button', { name: /حذف السؤال: سؤال لن يُحذف/ }));
    await user.click(screen.getByRole('button', { name: 'حذف نهائي' }));

    // العنصر باقٍ + إشعار خطأ (role=alert — لا يختفي تلقائياً)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('تعذّر حذف السؤال');
    });
    expect(screen.getByText('سؤال لن يُحذف')).toBeInTheDocument();
    expect(screen.queryByText(/لا توجد أسئلة بعد/)).not.toBeInTheDocument();
  });

  it('في المعاينة التجريبية يحذف محلياً دون استدعاء backend', async () => {
    const user = userEvent.setup();
    mockedFetchQuestionHistory.mockRejectedValue(new Error('network down'));
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'عرض معاينة تجريبية' }));
    expect(screen.getByText(DEMO_HISTORY[0].question)).toBeInTheDocument();

    await user.click((await screen.findAllByRole('button', { name: /حذف السؤال: / }))[0]);
    await user.click(screen.getByRole('button', { name: 'حذف نهائي' }));

    await waitFor(() => {
      expect(screen.queryByText(DEMO_HISTORY[0].question)).not.toBeInTheDocument();
    });
    expect(mockedDeleteQuestion).not.toHaveBeenCalled();
  });
});
