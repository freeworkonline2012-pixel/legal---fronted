/**
 * اختبارات صفحة طابور المراجعة البشرية (S-09 + EP-06) — الربط الفعلي بـ backend.
 *
 * الصفحة الآن تستهلك GET /api/reviews و PATCH /api/reviews/{id} (عقد
 * backend/openapi.yaml) بدل بيانات تجريبية مؤقتة. الاختبارات تمحّي
 * '@/lib/api-client' وتغذّي عناصر بالشكل الفعلي لعقد backend (ReviewItem
 * + context) — أي انحراف مستقبلي في العقد يكسر الاختبارات فوراً.
 *
 * تغطي:
 * - عرض عناصر الطابور بتسمية المجال بالعربية (وليست المفتاح الإنجليزي الخام).
 * - اشتقاق الأولوية من درجة الثقة (0.5 → ثقة منخفضة).
 * - الاعتماد/الرفض يستدعيان PATCH /reviews/{id} بالحالة الصحيحة ويرفعان العدّاد.
 * - ضغطة مزدوجة سريعة على [2] تُحتسب مراجعة واحدة فقط (حارس processing).
 * - حالات الخطأ: 401 (تسجيل دخول)، 403 (صلاحيات)، شبكة (إعادة محاولة + معاينة
 *   تجريبية صريحة ببانر تحذيري).
 * - فشل الحسم لا يزيل العنصر ويعرض خطأً.
 * - الحالة الفارغة بعد حسم كل العناصر (لا طريق مسدود).
 */

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReviewPage from './page';
import { ToastProvider } from '@/components/ui/Toast';
import { ThemeProvider } from '@/lib/theme';
import { fetchReviewQueue, resolveReview } from '@/lib/api-client';
import { DEMO_REVIEW_ITEMS } from '@/lib/demo-data';
import type { ReviewItem, ReviewListResponse } from '@/lib/types';

jest.mock('@/lib/api-client', () => ({
  fetchReviewQueue: jest.fn(),
  resolveReview: jest.fn(),
  logoutUser: jest.fn(),
}));

const mockedFetchReviewQueue = fetchReviewQueue as jest.MockedFunction<typeof fetchReviewQueue>;
const mockedResolveReview = resolveReview as jest.MockedFunction<typeof resolveReview>;

/** عنصر طابور بالشكل الفعلي لعقد backend (ReviewResponseDto + context) */
function backendItem(overrides: Partial<ReviewItem> = {}): ReviewItem {
  return {
    id: 'r-1024',
    answer_id: 'a-77',
    reviewer_id: null,
    status: 'pending',
    review_note: null,
    reviewed_at: null,
    created_at: '2026-08-17T08:00:00.000Z',
    context: {
      question: 'اتنفصلت من الشغل من غير إشعار، ليا حق تعويض؟',
      answer:
        'نعم، لك حق في تعويض عن إنهاء عقد العمل دون إشعار، وفقاً للمادة 110 من قانون العمل رقم 12 لسنة 2003.',
      confidence: 0.5,
      category: 'labor',
      citations: [
        {
          law: 'قانون العمل',
          law_no: 12,
          law_year: 2003,
          article_no: 110,
          status: 'active',
          last_amended: '2019-06-15',
          official_url: 'https://elpai.idsc.gov.eg/',
          snippet: 'إذا أنهي عقد العمل من جانب صاحب العمل...',
        },
      ],
    },
    ...overrides,
  };
}

function queueResponse(items: ReviewItem[]): ReviewListResponse {
  return { items, total: items.length };
}

/**
 * ⚠️ يجب لف الصفحة بـ ThemeProvider: ReviewPage تعرض <Header /> الذي يعرض
 * <ThemeToggle /> الذي يستدعي useTheme() — دون Provider يرمي الاختبار.
 */
function renderPage() {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <ReviewPage />
      </ToastProvider>
    </ThemeProvider>,
  );
}

/** ننتظر وصول الحالة الجاهزة (زر «اعتماد (1)» يظهر فقط مع عناصر فعلية) */
async function waitForReady(): Promise<void> {
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /اعتماد \(1\)/ })).toBeInTheDocument();
  });
}

/**
 * سطر «إحصاءات اليوم: N مراجعة» مقسوم عبر عناصر:
 * `<span>إحصاءات اليوم: <strong>N مراجعة</strong></span>` — المطابقة عبر
 * textContent الكامل تتفرد بالعنصر عن أسلافه.
 */
function statsLine(count: string) {
  return (_content: string, element: Element | null) =>
    element?.textContent === `إحصاءات اليوم: ${count} مراجعة`;
}

function remainingLine(count: string) {
  return (_content: string, element: Element | null) =>
    element?.textContent === `المتبقي: ${count}`;
}

describe('ReviewPage', () => {
  beforeEach(() => {
    mockedFetchReviewQueue.mockReset();
    mockedResolveReview.mockReset();
    mockedResolveReview.mockResolvedValue(backendItem({ status: 'approved' }));
  });

  it('يجلب الطابور من backend ويعرض عناصر بعنوان عربي والمجال بالعربية', async () => {
    mockedFetchReviewQueue.mockResolvedValue(queueResponse([backendItem()]));
    renderPage();

    await waitForReady();

    // الجلب تم بفلتر pending (العناصر القابلة للحسم فقط)
    expect(mockedFetchReviewQueue).toHaveBeenCalledWith('pending');
    // التسمية العربية للمجال — لا تسريب للمفتاح الخام (labor)
    expect(screen.getByText(/المجال: قانون العمل/)).toBeInTheDocument();
    expect(screen.queryByText(/المجال: labor/)).not.toBeInTheDocument();
    // الأولوية مشتقة من الثقة 0.5 → ثقة منخفضة
    expect(screen.getByText(/أولوية: ثقة منخفضة/)).toBeInTheDocument();
    expect(screen.getByText(statsLine('0'))).toBeInTheDocument();
  });

  it('الاعتماد يستدعي PATCH /reviews/{id} بـ approved ويرفع «إحصاءات اليوم» ويقلّل «المتبقي»', async () => {
    const user = userEvent.setup();
    mockedFetchReviewQueue.mockResolvedValue(queueResponse([backendItem()]));
    renderPage();

    await waitForReady();
    expect(screen.getByText(remainingLine('1'))).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /اعتماد \(1\)/ }));

    await waitFor(() => {
      expect(mockedResolveReview).toHaveBeenCalledWith('r-1024', { status: 'approved' });
    });
    await waitFor(() => {
      expect(screen.getByText(statsLine('1'))).toBeInTheDocument();
    });
    expect(screen.getByText(remainingLine('0'))).toBeInTheDocument();
  });

  it('اختصار لوحة المفاتيح [2] يرفض العنصر النشط (PATCH بـ rejected)', async () => {
    const user = userEvent.setup();
    mockedFetchReviewQueue.mockResolvedValue(queueResponse([backendItem()]));
    renderPage();

    await waitForReady();
    // ننتظر اكتمال تسجيل مستمع لوحة المفاتيح بالحالة المحدّثة
    await new Promise((resolve) => setTimeout(resolve, 30));

    await user.keyboard('2');

    await waitFor(() => {
      expect(mockedResolveReview).toHaveBeenCalledWith('r-1024', { status: 'rejected' });
    });
    await waitFor(() => {
      expect(screen.getByText(statsLine('1'))).toBeInTheDocument();
    });
  });

  it('ضغطة مزدوجة سريعة على [2] تُحتسب مراجعة واحدة فقط (حارس processing)', async () => {
    const user = userEvent.setup();
    mockedFetchReviewQueue.mockResolvedValue(queueResponse([backendItem()]));
    renderPage();

    await waitForReady();
    await new Promise((resolve) => setTimeout(resolve, 30));

    await user.keyboard('2');
    await user.keyboard('2');

    await waitFor(() => {
      expect(screen.getByText(statsLine('1'))).toBeInTheDocument();
    });
    expect(mockedResolveReview).toHaveBeenCalledTimes(1);
    expect(screen.getByText(remainingLine('0'))).toBeInTheDocument();
  });

  it('فشل الحسم لا يزيل العنصر ويعرض خطأً (لا يختفي تلقائياً)', async () => {
    const user = userEvent.setup();
    mockedFetchReviewQueue.mockResolvedValue(queueResponse([backendItem()]));
    mockedResolveReview.mockRejectedValue(new Error('فشل طلب الخلفية (HTTP 500)'));
    renderPage();

    await waitForReady();

    await user.click(screen.getByRole('button', { name: /اعتماد \(1\)/ }));

    // رسالة خطأ Toast تظهر ولا يختفي العنصر
    await screen.findByText(/تعذّر حفظ المراجعة/);
    expect(screen.getByText(statsLine('0'))).toBeInTheDocument();
    expect(screen.getByText(remainingLine('1'))).toBeInTheDocument();
  });

  it('يعرض «سجّل الدخول أولاً» عند استجابة 401', async () => {
    mockedFetchReviewQueue.mockRejectedValue(new Error('فشل طلب الخلفية (HTTP 401)'));
    renderPage();

    const title = await screen.findByText(/سجّل الدخول أولاً/);
    expect(title).toBeInTheDocument();
    // نطاق البحث داخل بطاقة EmptyState تحديداً — الهيدر (بعد تفعيل showAuth
    // افتراضياً فى كل الصفحات 2026-09-05) يعرض رابط "تسجيل الدخول" أيضاً،
    // فاستعلام غير مقيَّد سيجد عنصرين بنفس الاسم.
    const emptyStateCard = title.closest('div');
    expect(emptyStateCard).not.toBeNull();
    expect(
      within(emptyStateCard as HTMLElement).getByRole('link', { name: 'تسجيل الدخول' }),
    ).toBeInTheDocument();
  });

  it('يعرض رسالة صلاحيات عند استجابة 403', async () => {
    mockedFetchReviewQueue.mockRejectedValue(new Error('فشل طلب الخلفية (HTTP 403)'));
    renderPage();

    expect(await screen.findByText(/هذه اللوحة مخصصة للمحامين/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument();
  });

  it('يعرض معاينة تجريبية صريحة عند فشل الاتصال (بانر تحذيري + عناصر تجريبية)', async () => {
    const user = userEvent.setup();
    mockedFetchReviewQueue.mockRejectedValue(new Error('network down'));
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'عرض معاينة تجريبية' }));

    // نص السؤال يظهر مرتين (القائمة الجانبية + منطقة المراجعة) — نتحقق من وجوده
    expect(screen.getAllByText(DEMO_REVIEW_ITEMS[0].question).length).toBeGreaterThan(0);
    expect(screen.getByText(/تعرض عناصر تجريبية للمعاينة فقط/)).toBeInTheDocument();
  });

  it('يعرض الحالة الفارغة بعد حسم كل العناصر (لا طريق مسدود)', async () => {
    const user = userEvent.setup();
    mockedFetchReviewQueue.mockResolvedValue(queueResponse([backendItem()]));
    renderPage();

    await waitForReady();

    await user.click(screen.getByRole('button', { name: /اعتماد \(1\)/ }));
    await waitFor(() => {
      expect(screen.getByText(statsLine('1'))).toBeInTheDocument();
    });

    expect(screen.getByText(/لا عناصر في الطابور اليوم/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تحديث' })).toBeInTheDocument();
  });
});
