/**
 * اختبارات GuestSessionBootstrap — وضع الزائر للاختبار قبل الإطلاق التجريبى.
 *
 * الحالات الحرجة: (1) معطّل = لا شىء يظهر ولا يُنشأ حساب. (2) مفعَّل بلا موافقة سابقة =
 * بطاقة ولا إنشاء حتى الضغط. (3) موافقة سابقة على نفس النسخة = إنشاء تلقائى. (4) موافقة على
 * نسخة قديمة = تُطلب من جديد. (5) وجود جلسة = لا استدعاء إطلاقاً. (6) تخزين محجوب = لا حلقة
 * إعادة تحميل. (7) /login لا تظهر فيها البطاقة.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GuestSessionBootstrap } from './GuestSessionBootstrap';
import { createGuestSession, fetchGuestConfig } from '@/lib/api-client';
import { clearAuthSession, getAccessToken, setAuthSession } from '@/lib/auth';
import { clearStoredGuestConsent, hasStoredGuestConsent, storeGuestConsent } from '@/lib/guest';
import type { AuthResponse } from '@/lib/types';

jest.mock('@/lib/api-client', () => ({
  fetchGuestConfig: jest.fn(),
  createGuestSession: jest.fn(),
}));

const mockedConfig = fetchGuestConfig as jest.MockedFunction<typeof fetchGuestConfig>;
const mockedCreate = createGuestSession as jest.MockedFunction<typeof createGuestSession>;

const GUEST_SESSION: AuthResponse = {
  access_token: 'guest-access',
  refresh_token: 'guest-refresh',
  user: {
    id: 'g-1',
    email: 'guest-1@guest.invalid',
    full_name: null,
    role: 'user',
    created_at: '2026-10-17T10:00:00.000Z',
  },
};

const reloadMock = jest.fn();
const realLocation = window.location;

function setPath(pathname: string) {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...realLocation, pathname, reload: reloadMock },
  });
}

describe('GuestSessionBootstrap', () => {
  beforeEach(() => {
    clearAuthSession();
    clearStoredGuestConsent();
    mockedConfig.mockReset();
    mockedCreate.mockReset();
    reloadMock.mockReset();
    setPath('/chat');
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
  });

  it('وضع الزائر معطّل: لا بطاقة ولا إنشاء حساب', async () => {
    mockedConfig.mockResolvedValue({ enabled: false, consent_version: 'v1' });
    const { container } = render(<GuestSessionBootstrap />);
    await waitFor(() => expect(mockedConfig).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('فشل الاتصال بالخلفية: لا شىء يظهر ولا يرمى', async () => {
    mockedConfig.mockRejectedValue(new Error('down'));
    const { container } = render(<GuestSessionBootstrap />);
    await waitFor(() => expect(mockedConfig).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('مفعَّل بلا موافقة سابقة: تظهر البطاقة ولا يُنشأ حساب قبل الضغط', async () => {
    mockedConfig.mockResolvedValue({ enabled: true, consent_version: 'v1' });
    render(<GuestSessionBootstrap />);
    expect(await screen.findByRole('button', { name: 'موافق وابدأ' })).toBeInTheDocument();
    expect(screen.getByText(/151\/2020/)).toBeInTheDocument();
    expect(mockedCreate).not.toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
  });

  it('الضغط على «موافق وابدأ»: ينشئ الجلسة ويحفظها ويتذكّر الموافقة ويعيد التحميل مرة واحدة', async () => {
    mockedConfig.mockResolvedValue({ enabled: true, consent_version: 'v1' });
    mockedCreate.mockResolvedValue(GUEST_SESSION);
    render(<GuestSessionBootstrap />);
    await userEvent.setup().click(await screen.findByRole('button', { name: 'موافق وابدأ' }));

    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1));
    expect(mockedCreate).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe('guest-access');
    expect(hasStoredGuestConsent('v1')).toBe(true);
  });

  it('موافقة سابقة على نفس النسخة: يبدأ تلقائياً بلا بطاقة', async () => {
    storeGuestConsent('v1');
    mockedConfig.mockResolvedValue({ enabled: true, consent_version: 'v1' });
    mockedCreate.mockResolvedValue(GUEST_SESSION);
    render(<GuestSessionBootstrap />);
    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1));
    expect(mockedCreate).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'موافق وابدأ' })).not.toBeInTheDocument();
  });

  it('موافقة على نسخة قديمة من السياسة: تُطلب موافقة جديدة', async () => {
    storeGuestConsent('v0');
    mockedConfig.mockResolvedValue({ enabled: true, consent_version: 'v1' });
    render(<GuestSessionBootstrap />);
    expect(await screen.findByRole('button', { name: 'موافق وابدأ' })).toBeInTheDocument();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('توجد جلسة: لا استدعاء للخلفية إطلاقاً', async () => {
    setAuthSession(GUEST_SESSION);
    const { container } = render(<GuestSessionBootstrap />);
    await Promise.resolve();
    expect(mockedConfig).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  it('تخزين محجوب (الجلسة لم تُحفظ): لا إعادة تحميل (لا حلقة) وتظهر رسالة الخطأ', async () => {
    mockedConfig.mockResolvedValue({ enabled: true, consent_version: 'v1' });
    mockedCreate.mockResolvedValue(GUEST_SESSION);
    const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<GuestSessionBootstrap />);
    await userEvent.setup().click(await screen.findByRole('button', { name: 'موافق وابدأ' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر بدء جلسة الزائر');
    expect(reloadMock).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('فشل إنشاء الجلسة (مثلاً 429): تظهر رسالة ويمكن المحاولة ثانية', async () => {
    mockedConfig.mockResolvedValue({ enabled: true, consent_version: 'v1' });
    mockedCreate.mockRejectedValueOnce(new Error('429')).mockResolvedValueOnce(GUEST_SESSION);
    render(<GuestSessionBootstrap />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'موافق وابدأ' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(reloadMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'موافق وابدأ' }));
    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1));
  });

  it('صفحة /login: لا بطاقة ولا استدعاء', async () => {
    setPath('/login');
    const { container } = render(<GuestSessionBootstrap />);
    await Promise.resolve();
    expect(mockedConfig).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  function jwtWithExp(expSeconds: number): string {
    const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `${b64({ alg: 'HS256' })}.${b64({ exp: expSeconds })}.sig`;
  }

  it('جلسة زائر منتهية: تُمسح ويبدأ زائر جديد تلقائياً (موافقة سابقة)', async () => {
    setAuthSession({ ...GUEST_SESSION, access_token: jwtWithExp(Math.floor(Date.now() / 1000) - 3600) });
    storeGuestConsent('v1');
    mockedConfig.mockResolvedValue({ enabled: true, consent_version: 'v1' });
    mockedCreate.mockResolvedValue({ ...GUEST_SESSION, access_token: jwtWithExp(Math.floor(Date.now() / 1000) + 86400) });
    render(<GuestSessionBootstrap />);
    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(reloadMock).toHaveBeenCalled());
  });

  it('جلسة زائر سارية: لا استدعاء ولا مسح', async () => {
    const token = jwtWithExp(Math.floor(Date.now() / 1000) + 86400);
    setAuthSession({ ...GUEST_SESSION, access_token: token });
    mockedConfig.mockResolvedValue({ enabled: true, consent_version: 'v1' });
    render(<GuestSessionBootstrap />);
    await new Promise((r) => setTimeout(r, 20));
    expect(mockedConfig).not.toHaveBeenCalled();
    expect(getAccessToken()).toBe(token);
  });

  it('جلسة مستخدم عادى منتهية لا تُمسح ولا يُنشأ زائر (يبقى تسجيل الدخول)', async () => {
    const token = jwtWithExp(Math.floor(Date.now() / 1000) - 3600);
    setAuthSession({
      access_token: token,
      refresh_token: 'r',
      user: { ...GUEST_SESSION.user, email: 'me@example.com' },
    });
    mockedConfig.mockResolvedValue({ enabled: true, consent_version: 'v1' });
    render(<GuestSessionBootstrap />);
    await new Promise((r) => setTimeout(r, 20));
    expect(mockedCreate).not.toHaveBeenCalled();
    expect(getAccessToken()).toBe(token);
  });
});
