/**
 * اختبارات صفحة تسجيل الدخول / إنشاء حساب (S-06 + F-14 + H-2 + 151/2020).
 *
 * تغطي (أول تغطية اختبارية لصفحة /login):
 * - التحقق الأمامي: كلمة مرور أقصر من 8 أحرف تمنع الإرسال برسالة خطأ.
 * - إنشاء حساب: الموافقة على معالجة البيانات (151/2020) شرط للإرسال.
 * - تسجيل دخول ناجح: استدعاء loginUser بالبيانات + توجيه إلى /chat.
 * - بريد مسجّل مسبقاً (409 Conflict في backend auth.service.ts): رسالة
 *   محددة «مسجّل مسبقاً» بدل رسالة «بيانات غير صحيحة» العامة (عيب حقيقي أُصلح
 *   هذه الجولة — كان المستخدم يحصل على رسالة مضلّلة عند محاولة إنشاء حساب
 *   ببريد موجود).
 *
 * ⚠️ الصفحة تعرض <Header /> الذي يستدعي useTheme() وuseToast() — لذلك يجب
 * لفها بـ ThemeProvider + ToastProvider (نفس نمط Header.test.tsx).
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './page';
import { ToastProvider } from '@/components/ui/Toast';
import { ThemeProvider } from '@/lib/theme';
import { loginUser, registerUser } from '@/lib/api-client';
import type { AuthResponse } from '@/lib/types';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/lib/api-client', () => ({
  loginUser: jest.fn(),
  registerUser: jest.fn(),
  logoutUser: jest.fn(),
}));

const mockedLoginUser = loginUser as jest.MockedFunction<typeof loginUser>;
const mockedRegisterUser = registerUser as jest.MockedFunction<typeof registerUser>;

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

function renderPage() {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <LoginPage />
      </ToastProvider>
    </ThemeProvider>,
  );
}

describe('LoginPage', () => {
  // حفظ واصف window.location الأصلي لاستعادته بعد اختبار ?mode=signup
  // (jsdom يجعل location قابلاً لإعادة التعريف عبر defineProperty في الاختبار).
  const originalLocationDescriptor = Object.getOwnPropertyDescriptor(window, 'location');

  beforeEach(() => {
    mockPush.mockClear();
    mockedLoginUser.mockReset();
    mockedRegisterUser.mockReset();
    if (originalLocationDescriptor) {
      Object.defineProperty(window, 'location', originalLocationDescriptor);
    }
  });

  /**
   * DEF-3 (Live Experience Sentinel round 20): /register → /login?mode=signup
   * عبر next.config.mjs redirect. هذا الاختبار يضمن أن الوجهة الفعلية للـ redirect
   * تُفعّل تبويب «حساب جديد» تلقائياً (الموافقة 151/2020 ظاهرة) — أي أن المستخدم
   * الذي يصل عبر /register يجد نموذج إنشاء الحساب مباشرة وليس تسجيل الدخول.
   */
  it('?mode=signup (وجهة redirect /register) يفتح تبويب «حساب جديد» تلقائياً', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { search: '?mode=signup' },
    });

    const user = userEvent.setup();
    renderPage();

    // تبويب «حساب جديد» نشط والموافقة على معالجة البيانات (151/2020) ظاهرة
    expect(screen.getByRole('tab', { name: 'حساب جديد' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText(/أوافق على معالجة بياناتي/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إنشاء الحساب' })).toBeInTheDocument();
  });

  it('يمنع الإرسال عند كلمة مرور أقصر من 8 أحرف (تحقق أمامي)', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/البريد الإلكتروني/), 'user@example.com');
    await user.type(screen.getByLabelText(/كلمة المرور/), '123');
    await user.click(screen.getByRole('button', { name: 'تسجيل الدخول' }));

    expect(await screen.findByText(/كلمة المرور 8 أحرف على الأقل/)).toBeInTheDocument();
    expect(mockedLoginUser).not.toHaveBeenCalled();
  });

  it('يتطلب الموافقة على معالجة البيانات (151/2020) في وضع إنشاء الحساب', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: 'حساب جديد' }));
    await user.type(screen.getByLabelText(/البريد الإلكتروني/), 'user@example.com');
    await user.type(screen.getByLabelText(/كلمة المرور/), 'password123');
    await user.click(screen.getByRole('button', { name: 'إنشاء الحساب' }));

    expect(await screen.findByText(/نحتاج موافقتك على معالجة بياناتك/)).toBeInTheDocument();
    expect(mockedRegisterUser).not.toHaveBeenCalled();
  });

  it('تسجيل دخول ناجح: يستدعي loginUser بالبيانات ويوجّه إلى /chat', async () => {
    const user = userEvent.setup();
    mockedLoginUser.mockResolvedValue(SESSION);
    renderPage();

    await user.type(screen.getByLabelText(/البريد الإلكتروني/), 'user@example.com');
    await user.type(screen.getByLabelText(/كلمة المرور/), 'password123');
    await user.click(screen.getByRole('button', { name: 'تسجيل الدخول' }));

    await waitFor(() => {
      expect(mockedLoginUser).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      });
    });
    expect(mockPush).toHaveBeenCalledWith('/chat');
  });

  it('بريد مسجّل مسبقاً (409) في وضع إنشاء الحساب: رسالة محددة بدل العامة', async () => {
    const user = userEvent.setup();
    // المحاكاة تعكس ApiError الفعلي: رسالته تتضمن كود الحالة «(HTTP 409)»
    mockedRegisterUser.mockRejectedValue(new Error('فشل طلب الخلفية (HTTP 409)'));
    renderPage();

    await user.click(screen.getByRole('tab', { name: 'حساب جديد' }));
    await user.type(screen.getByLabelText(/البريد الإلكتروني/), 'taken@example.com');
    await user.type(screen.getByLabelText(/كلمة المرور/), 'password123');
    await user.click(screen.getByLabelText(/أوافق على معالجة بياناتي/));
    await user.click(screen.getByRole('button', { name: 'إنشاء الحساب' }));

    // الرسالة تظهر في رسالة الخطأ المضمّنة وربما كـ Toast (نفس النص) — نسمح بأكثر من تطابق
    const matches = await screen.findAllByText(/هذا البريد مسجّل مسبقاً/);
    expect(matches.length).toBeGreaterThan(0);
    // لا رسالة «بيانات الدخول غير صحيحة» المضلّلة
    expect(screen.queryByText(/بيانات الدخول غير صحيحة/)).not.toBeInTheDocument();
  });
});
