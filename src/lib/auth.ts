/**
 * إدارة جلسة المصادقة في الواجهة (H-2 — ربط المصادقة بـ backend).
 *
 * ⚠️ خصوصية وفق DPIA/151-2020:
 * - تُخزَّن التوكنات في sessionStorage (حصرية للتبويب) وليس localStorage —
 *   لا بقاء للجلسة بعد إغلاق التبويب، حد أدنى من التخزين الحساس.
 * - لا تُخزَّن كلمة المرور أبداً، ولا أي محتوى أسئلة/إجابات.
 * - الحقول قابلة للمسح الكامل عبر clearAuthSession (حق الحذف).
 *
 * كل الدوال آمنة لـ SSR: تُعيد القيم الافتراضية خارج المتصفح.
 */

import type { AuthResponse, UserResponse } from './types';

const ACCESS_TOKEN_KEY = 'legalqa.access_token';
const REFRESH_TOKEN_KEY = 'legalqa.refresh_token';
const USER_KEY = 'legalqa.user';

function hasWindow(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

/** توكن الوصول الحالي أو null (لا جلسة / خارج المتصفح) */
export function getAccessToken(): string | null {
  if (!hasWindow()) return null;
  try {
    return window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** توكن التحديث الحالي أو null */
export function getRefreshToken(): string | null {
  if (!hasWindow()) return null;
  try {
    return window.sessionStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** المستخدم الحالي (مُحلّل من JSON) أو null */
export function getCurrentUser(): UserResponse | null {
  if (!hasWindow()) return null;
  try {
    const raw = window.sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserResponse;
  } catch {
    return null;
  }
}

/** هل توجد جلسة نشطة؟ */
export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}

/** حفظ الجلسة بعد register/login */
export function setAuthSession(session: AuthResponse): void {
  if (!hasWindow()) return;
  try {
    window.sessionStorage.setItem(ACCESS_TOKEN_KEY, session.access_token);
    window.sessionStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token);
    window.sessionStorage.setItem(USER_KEY, JSON.stringify(session.user));
  } catch {
    // تجاهل — التخزين غير متاح (وضع الخصوصية مثلاً)؛ يبقى المستخدم غير مصادق
  }
}

/** مسح الجلسة كاملة (تسجيل خروج / حق الحذف) */
export function clearAuthSession(): void {
  if (!hasWindow()) return;
  try {
    window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    window.sessionStorage.removeItem(USER_KEY);
  } catch {
    // تجاهل
  }
}
