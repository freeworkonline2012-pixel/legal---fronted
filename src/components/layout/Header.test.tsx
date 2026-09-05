/**
 * اختبارات Header — الهيدر الثابت (component_states.md القسم 15).
 *
 * يغطي:
 * - الشعار والروابط الرئيسية.
 * - حالة عدم وجود جلسة: أزرار الدخول/التسجيل.
 * - حالة وجود جلسة: البريد + زر الخروج.
 * - showAuth=false: إخفاء أزرار المصادقة (شاشات التطبيق المعتمدة).
 * - تسجيل الخروج: استدعاء logoutUser + عودة أزرار الدخول.
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
  });

  it('يعرض أزرار الدخول والتسجيل عند غياب الجلسة', () => {
    renderHeader();
    expect(screen.getByRole('link', { name: 'تسجيل الدخول' })).toBeInTheDocument();
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
    expect(screen.queryByRole('link', { name: 'تسجيل الدخول' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'جرّب مجاناً' })).not.toBeInTheDocument();
  });

  it('يسجّل الخروج: يستدعي logoutUser ويمسح الجلسة ويعود لأزرار الدخول', async () => {
    const user = userEvent.setup();
    setAuthSession(SESSION);
    renderHeader();
    await screen.findByText('user@example.com');

    await user.click(screen.getByRole('button', { name: 'خروج' }));

    expect(mockedLogoutUser).toHaveBeenCalledTimes(1);
    // إعادة العرض بعد مسح الجلسة غير متزامنة (await داخل المعالج) — ننتظرها
    expect(await screen.findByRole('link', { name: 'تسجيل الدخول' })).toBeInTheDocument();
    expect(screen.queryByText('user@example.com')).not.toBeInTheDocument();
  });
});
