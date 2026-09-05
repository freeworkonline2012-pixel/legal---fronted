/**
 * اختبارات Header — الهيدر الثابت (component_states.md القسم 15).
 *
 * يغطي:
 * - الشعار والروابط الرئيسية (و"اشترك" غير موجود — أُخفى من القائمة).
 * - حالة عدم وجود جلسة: "جرّب مجاناً" فقط ("تسجيل الدخول" مُخفى — بطلب
 *   صريح 2026-09-05).
 * - حالة وجود جلسة: البريد + زر الخروج.
 * - showAuth=false: إخفاء زر "جرّب مجاناً" (شاشات التطبيق المعتمدة).
 * - تسجيل الخروج: استدعاء logoutUser + عودة زر "جرّب مجاناً".
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from './Header';
import { ThemeProvider } from '@/lib/theme';
import { ToastProvider } from '@/components/ui/Toast';
import { clearAuthSession, setAuthSession } from '@/lib/auth';
import { logoutUser } from '@/lib/api-client';
import type { AuthResponse } from '@/lib/types';

jest.mock('@/lib/api-client', () => ({
  logoutUser: jest.fn(),
}));

const mockedLogoutUser = logoutUser as jest.MockedFunction<typeof logoutUser>;

const SESSION: AuthResponse = {
  access_token: 'access-1',
  refresh_token: 'refresh-1',
  user: {
    id: 'u-1',
    email: 'user@example.com',
    full_name: null,
    role: 'user',
    created_at: '2026-01-01T10:00:00.000Z',
  },
};

function renderHeader(showAuth = true) {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <Header showAuth={showAuth} />
      </ToastProvider>
    </ThemeProvider>,
  );
}

describe('Header', () => {
  beforeEach(() => {
    clearAuthSession();
    mockedLogoutUser.mockReset();
    mockedLogoutUser.mockResolvedValue({ success: true });
  });

  it('يعرض الشعار والروابط الرئيسية', () => {
    renderHeader();
    const brandLink = screen.getByRole('link', { name: /شيلد.*منصة قانونية عربية/ });
    expect(brandLink).toBeInTheDocument();
    expect(brandLink).toHaveTextContent('شيلد');
    expect(brandLink).toHaveTextContent('منصة قانونية عربية');
    expect(screen.getByRole('link', { name: 'الرئيسية' })).toHaveAttribute('href', '/chat');
    expect(screen.getByRole('link', { name: 'القوانين' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'الأدلة الإرشادية' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'تحقق الالتزام' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'تدقيق العقود' })).toBeInTheDocument();
    // أُخفيا من القائمة العلوية بطلب صريح 2026-09-05 — الصفحتان (/login،
    // /pricing) تبقيان تعملان، فقط أُزيل الرابطان من التنقل الرئيسى.
    expect(screen.queryByRole('link', { name: 'اشترك' })).not.toBeInTheDocument();
  });

  it('يعرض «جرّب مجاناً» فقط (لا «تسجيل الدخول») عند غياب الجلسة', () => {
    renderHeader();
    expect(screen.queryByRole('link', { name: 'تسجيل الدخول' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'جرّب مجاناً' })).toBeInTheDocument();
  });

  it('يعرض البريد وزر الخروج عند وجود جلسة', async () => {
    setAuthSession(SESSION);
    renderHeader();
    expect(await screen.findByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'خروج' })).toBeInTheDocument();
  });

  it('يخفي أزرار المصادقة عند showAuth=false', () => {
    renderHeader(false);
    expect(screen.queryByRole('link', { name: 'جرّب مجاناً' })).not.toBeInTheDocument();
  });

  it('يسجّل الخروج: يستدعي logoutUser ويمسح الجلسة ويعود لزر «جرّب مجاناً»', async () => {
    const user = userEvent.setup();
    setAuthSession(SESSION);
    renderHeader();
    await screen.findByText('user@example.com');

    await user.click(screen.getByRole('button', { name: 'خروج' }));

    expect(mockedLogoutUser).toHaveBeenCalledTimes(1);
    // إعادة العرض بعد مسح الجلسة غير متزامنة (await داخل المعالج) — ننتظرها.
    // "تسجيل الدخول" مُخفى من القائمة (بطلب صريح 2026-09-05)، فالزر الذى
    // يعود هو "جرّب مجاناً" (يشير أصلاً لنفس صفحة /login).
    expect(await screen.findByRole('link', { name: 'جرّب مجاناً' })).toBeInTheDocument();
    expect(screen.queryByText('user@example.com')).not.toBeInTheDocument();
  });
});
