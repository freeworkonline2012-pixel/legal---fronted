/**
 * اختبارات MainSidebar — "القائمة الرئيسية" (سابقاً ChatSidebar "محادثاتى").
 *
 * يغطي:
 * - عرض شجرة الدول مع عدد القوانين، وشارة "قريباً" للدول الفارغة.
 * - فتح دولة يُظهر "المكتبة القانونية" بقوائم منسدلة تضم كل القوانين والقرارات
 *   والأدلة الإرشادية (روابط تفاصيل فعلية)، وقائمتين فارغتين (مراجع/أحكام).
 * - "الوطن العربى" قائمة منسدلة (مفتوحة افتراضياً) تضم كل الدول؛ رمز XA لا يُعرض كدولة.
 * - اللوائح التنفيذية قائمة منسدلة تضم كل اللوائح (kind=regulation).
 * - "محادثاتى" تظهر فقط لمستخدم مسجّل دخوله (isAuthenticated فعلى عبر
 *   sessionStorage — لا mock شكلى)، وتبقى مخفية (مع دعوة لتسجيل الدخول)
 *   لزائر غير مسجّل.
 * - onSelect/onNewConversation يعملان كما فى ChatSidebar سابقاً بعد تسجيل الدخول.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MainSidebar } from './MainSidebar';
import { setAuthSession, clearAuthSession } from '@/lib/auth';
import type { AuthResponse } from '@/lib/types';

jest.mock('@/lib/api-client', () => ({
  fetchCountries: jest.fn(),
  fetchLaws: jest.fn(),
  fetchGuidanceList: jest.fn(),
}));

import { fetchCountries, fetchGuidanceList, fetchLaws } from '@/lib/api-client';

const mockedFetchCountries = fetchCountries as jest.MockedFunction<typeof fetchCountries>;
const mockedFetchLaws = fetchLaws as jest.MockedFunction<typeof fetchLaws>;
const mockedFetchGuidance = fetchGuidanceList as jest.MockedFunction<typeof fetchGuidanceList>;

const SESSION: AuthResponse = {
  access_token: 'test-token',
  refresh_token: 'test-refresh',
  user: { id: 'u1', email: 'a@example.com', full_name: null, role: 'user', created_at: '2026-01-01T00:00:00.000Z' },
};

const CONVERSATIONS = [
  { id: 'c1', title: 'نزاع عمل' },
  { id: 'c2', title: 'نفقة' },
];

const COUNTRIES = {
  items: [
    { code: 'EG', name_ar: 'مصر', name_en: 'Egypt', display_order: 1, is_active: true, law_count: 2 },
    { code: 'SA', name_ar: 'السعودية', name_en: 'Saudi Arabia', display_order: 2, is_active: true, law_count: 0 },
    { code: 'XA', name_ar: 'الوطن العربى', name_en: 'Arab World', display_order: 6, is_active: true, law_count: 0 },
  ],
};

const EG_LAWS = {
  items: [
    {
      id: 'l1',
      law_no: 12,
      law_year: 2003,
      title: 'قانون العمل',
      short_title: 'قانون العمل',
      category: 'labor',
      kind: 'law',
      country_code: 'EG',
      status: 'in_force' as const,
      official_url: null,
      enacted_at: null,
      last_amended_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'l2',
      law_no: 4,
      law_year: 1996,
      title: 'قانون الإيجارات',
      short_title: 'قانون الإيجارات',
      category: 'rent',
      kind: 'law',
      country_code: 'EG',
      status: 'in_force' as const,
      official_url: null,
      enacted_at: null,
      last_amended_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'l3',
      law_no: 100,
      law_year: 2020,
      title: 'قرار رئيس الوزراء بشأن اللوائح',
      short_title: null,
      category: 'labor',
      kind: 'pm_decision',
      country_code: 'EG',
      status: 'in_force' as const,
      official_url: null,
      enacted_at: null,
      last_amended_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'l4',
      law_no: 5,
      law_year: 2005,
      title: 'اللائحة التنفيذية لقانون العمل',
      short_title: null,
      category: 'labor',
      kind: 'regulation',
      country_code: 'EG',
      status: 'in_force' as const,
      official_url: null,
      enacted_at: null,
      last_amended_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ],
  total: 4,
};

const EG_GUIDANCE = {
  items: [
    {
      id: 'g1',
      title: 'دليل الحوكمة الرشيدة',
      issuing_authority: null,
      category: 'corporate',
      country_code: 'EG',
      official_url: null,
      issued_at: null,
      related_law: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ],
  total: 1,
};

function renderSidebar(props?: Partial<Parameters<typeof MainSidebar>[0]>) {
  return render(
    <MainSidebar conversations={CONVERSATIONS} {...props} />,
  );
}

describe('MainSidebar', () => {
  beforeEach(() => {
    mockedFetchCountries.mockReset().mockResolvedValue(COUNTRIES);
    mockedFetchLaws.mockReset().mockResolvedValue(EG_LAWS);
    mockedFetchGuidance.mockReset().mockResolvedValue(EG_GUIDANCE);
    clearAuthSession();
  });

  it('يعرض شجرة الدول مع عدد القوانين، وشارة "قريباً" للدولة الفارغة', async () => {
    renderSidebar();
    expect(await screen.findByText('مصر')).toBeInTheDocument();
    expect(screen.getByText('السعودية')).toBeInTheDocument();
    expect(screen.getAllByText('قريباً')).toHaveLength(1); // السعودية فقط
  });

  it('فتح دولة يُظهر "المكتبة القانونية" بقوائم منسدلة ورابط اللوائح التنفيذية', async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(await screen.findByRole('button', { name: /مصر/ }));

    expect(await screen.findByText('المكتبة القانونية')).toBeInTheDocument();
    for (const name of ['القوانين', 'القرارات', 'اللوائح التنفيذية', 'الأدلة الإرشادية', 'مراجع قانونية', 'أحكام قضائية']) {
      expect(screen.getByRole('button', { name: new RegExp(name) })).toHaveAttribute('aria-expanded', 'false');
    }
    // لا روابط عناصر قبل فتح القائمة المنسدلة
    expect(screen.queryByRole('link', { name: 'قانون العمل' })).not.toBeInTheDocument();
  });

  it('قائمة القوانين المنسدلة تضم كل القوانين (kind=law فقط) بروابط التفاصيل', async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(await screen.findByRole('button', { name: /مصر/ }));
    await user.click(await screen.findByRole('button', { name: /^القوانين/ }));

    expect(screen.getByRole('link', { name: 'قانون العمل' })).toHaveAttribute('href', '/laws/l1');
    expect(screen.getByRole('link', { name: 'قانون الإيجارات' })).toHaveAttribute('href', '/laws/l2');
    expect(screen.queryByRole('link', { name: /قرار رئيس الوزراء/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'عرض الكل' })).toHaveAttribute('href', '/laws?country=EG');
  });

  it('قائمة القرارات المنسدلة تضم القرارات فقط', async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(await screen.findByRole('button', { name: /مصر/ }));
    await user.click(await screen.findByRole('button', { name: /^القرارات/ }));

    expect(screen.getByRole('link', { name: /قرار رئيس الوزراء/ })).toHaveAttribute('href', '/laws/l3');
    expect(screen.queryByRole('link', { name: 'قانون العمل' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'عرض الكل' })).toHaveAttribute('href', '/decisions?country=EG');
  });

  it('اللوائح التنفيذية قائمة منسدلة تضم اللوائح فقط', async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(await screen.findByRole('button', { name: /مصر/ }));
    await user.click(await screen.findByRole('button', { name: /^اللوائح التنفيذية/ }));

    expect(screen.getByRole('link', { name: /اللائحة التنفيذية لقانون العمل/ })).toHaveAttribute('href', '/laws/l4');
    expect(screen.queryByRole('link', { name: 'قانون العمل' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'عرض الكل' })).toHaveAttribute('href', '/regulations?country=EG');
  });

  it('الأدلة الإرشادية تُجلب بمعامل الدولة وتُعرض بروابط /guidance/{id}', async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(await screen.findByRole('button', { name: /مصر/ }));
    await waitFor(() =>
      expect(mockedFetchGuidance).toHaveBeenCalledWith(expect.objectContaining({ country: 'EG' })),
    );
    await user.click(await screen.findByRole('button', { name: /^الأدلة الإرشادية/ }));

    expect(await screen.findByRole('link', { name: 'دليل الحوكمة الرشيدة' })).toHaveAttribute(
      'href',
      '/guidance/g1',
    );
  });

  it('فشل جلب الأدلة يُظهر رسالة خطأ داخل القائمة دون كسر بقية الشجرة', async () => {
    mockedFetchGuidance.mockReset().mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();
    renderSidebar();
    await user.click(await screen.findByRole('button', { name: /مصر/ }));
    await user.click(await screen.findByRole('button', { name: /^الأدلة الإرشادية/ }));
    expect(await screen.findByText('تعذّر التحميل حالياً.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^القوانين/ })).toBeInTheDocument();
  });

  it('مراجع قانونية وأحكام قضائية قائمتان فارغتان بحالة "ستُضاف قريباً"', async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(await screen.findByRole('button', { name: /مصر/ }));
    await user.click(await screen.findByRole('button', { name: /مراجع قانونية/ }));
    expect(screen.getByText('ستُضاف قريباً')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /أحكام قضائية/ }));
    expect(screen.getAllByText('ستُضاف قريباً')).toHaveLength(2);
  });

  it('حقل البحث يظهر عند طول القائمة ويصفّى العناصر', async () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      ...EG_LAWS.items[0],
      id: `m${i}`,
      title: i === 5 ? 'قانون الضرائب' : `قانون رقم ${i}`,
      short_title: null,
    }));
    mockedFetchLaws.mockReset().mockResolvedValue({ items: many, total: 12 });
    const user = userEvent.setup();
    renderSidebar();
    await user.click(await screen.findByRole('button', { name: /مصر/ }));
    await user.click(await screen.findByRole('button', { name: /^القوانين/ }));

    await user.type(screen.getByRole('searchbox', { name: 'بحث فى القوانين' }), 'الضرائب');
    expect(screen.getByRole('link', { name: 'قانون الضرائب' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'قانون رقم 1' })).not.toBeInTheDocument();
  });

  it('"الوطن العربى" قائمة منسدلة مفتوحة افتراضياً تضم الدول، ويمكن طيّها، ولا يُعرض XA كدولة', async () => {
    const user = userEvent.setup();
    renderSidebar();
    const group = await screen.findByRole('button', { name: 'الوطن العربى' });
    expect(group).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /مصر/ })).toBeInTheDocument();
    // XA موجود فى بيانات الدول لكنه لا يظهر كصف دولة (اسمه هو عنوان المجموعة فقط)
    expect(screen.getAllByText('الوطن العربى')).toHaveLength(1);

    await user.click(group);
    expect(group).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /مصر/ })).not.toBeInTheDocument();
  });

  it('فشل جلب القوانين لا يُسقط شجرة الدول — القائمة تُظهر رسالة خطأ', async () => {
    mockedFetchLaws.mockReset().mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();
    renderSidebar();
    await user.click(await screen.findByRole('button', { name: /مصر/ }));
    await user.click(await screen.findByRole('button', { name: /^القوانين/ }));
    expect(await screen.findByText('تعذّر التحميل حالياً.')).toBeInTheDocument();
  });

  it('دولة "قريباً" لا تُفتح عند النقر', async () => {
    const user = userEvent.setup();
    renderSidebar();
    const saudiButton = await screen.findByRole('button', { name: /السعودية/ });
    expect(saudiButton).toBeDisabled();
    await user.click(saudiButton);
    expect(screen.queryByText('المكتبة القانونية')).not.toBeInTheDocument();
  });

  it('لا تظهر "محادثاتى" لزائر غير مسجّل — تظهر دعوة لتسجيل الدخول بدلاً منها', async () => {
    renderSidebar();
    await screen.findByText('مصر');
    expect(screen.queryByText('محادثاتى')).not.toBeInTheDocument();
    expect(screen.queryByText('نزاع عمل')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'سجّل الدخول' })).toBeInTheDocument();
  });

  it('تظهر "محادثاتى" فعلياً بعد تسجيل الدخول (isAuthenticated حقيقية)', async () => {
    setAuthSession(SESSION);
    renderSidebar();
    await screen.findByText('مصر');
    expect(await screen.findByText('محادثاتى')).toBeInTheDocument();
    expect(screen.getByText('نزاع عمل')).toBeInTheDocument();
    expect(screen.getByText('نفقة')).toBeInTheDocument();
  });

  it('يستدعي onSelect وonNewConversation بعد تسجيل الدخول (سلوك مطابق لِـChatSidebar سابقاً)', async () => {
    setAuthSession(SESSION);
    const user = userEvent.setup();
    const onSelect = jest.fn();
    const onNewConversation = jest.fn();
    renderSidebar({ onSelect, onNewConversation });

    await user.click(await screen.findByRole('button', { name: /نفقة/ }));
    expect(onSelect).toHaveBeenCalledWith('c2');

    await user.click(screen.getByRole('button', { name: /محادثة جديدة/ }));
    expect(onNewConversation).toHaveBeenCalledTimes(1);
  });
});
