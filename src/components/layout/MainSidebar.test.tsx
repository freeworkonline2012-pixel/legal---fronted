/**
 * اختبارات MainSidebar — "القائمة الرئيسية" (سابقاً ChatSidebar "محادثاتى").
 *
 * يغطي:
 * - عرض شجرة الدول مع عدد القوانين، وشارة "قريباً" للدول الفارغة.
 * - فتح دولة يُظهر المجالات القانونية المتوفرة فيها بروابط /laws؟country=..
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
}));

import { fetchCountries, fetchLaws } from '@/lib/api-client';

const mockedFetchCountries = fetchCountries as jest.MockedFunction<typeof fetchCountries>;
const mockedFetchLaws = fetchLaws as jest.MockedFunction<typeof fetchLaws>;

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
  ],
  total: 2,
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
    clearAuthSession();
  });

  it('يعرض شجرة الدول مع عدد القوانين، وشارة "قريباً" للدولة الفارغة', async () => {
    renderSidebar();
    expect(await screen.findByText('مصر')).toBeInTheDocument();
    expect(screen.getByText('السعودية')).toBeInTheDocument();
    expect(screen.getByText('قريباً')).toBeInTheDocument();
  });

  it('فتح دولة تحتوى قوانين يُظهر تصنيف "المكتبة القانونية" ومجالاتها الفرعية', async () => {
    const user = userEvent.setup();
    renderSidebar();
    const egyptButton = await screen.findByRole('button', { name: /مصر/ });
    await user.click(egyptButton);

    expect(await screen.findByText('المكتبة القانونية')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'القوانين' })).toHaveAttribute(
      'href',
      '/laws?country=EG',
    );
    expect(screen.getByRole('link', { name: 'القرارات' })).toHaveAttribute(
      'href',
      '/decisions?country=EG',
    );
    expect(screen.getByRole('link', { name: 'اللوائح التنفيذية' })).toHaveAttribute(
      'href',
      '/regulations?country=EG',
    );
    expect(screen.getByRole('link', { name: 'الأدلة الاسترشادية' })).toHaveAttribute(
      'href',
      '/guidance',
    );

    const laborLink = await screen.findByRole('link', { name: /قانون العمل/ });
    expect(laborLink).toHaveAttribute('href', '/laws?country=EG&category=labor');
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
