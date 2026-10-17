/**
 * وضع الزائر — مساعدات الواجهة (الاختبار قبل الإطلاق التجريبى).
 *
 * الزائر حساب مؤقت حقيقى فى الخلفية (بريده guest-<uuid>@guest.invalid) — راجع
 * backend/src/auth/guest.constants.ts. الجلسة تبقى فى sessionStorage كأى جلسة
 * (حصرية للتبويب)، أما موافقة الخصوصية على نسخة السياسة فتُتذكَّر فى localStorage
 * (قيمة النسخة فقط، لا بيانات شخصية) كى لا يُسأل المختبر فى كل تبويب جديد.
 */

import type { UserResponse } from './types';

export const GUEST_EMAIL_DOMAIN = 'guest.invalid';

const CONSENT_KEY = 'legalqa.guest_consent_version';

export function isGuestUser(user: Pick<UserResponse, 'email'> | null | undefined): boolean {
  return !!user?.email && user.email.trim().toLowerCase().endsWith(`@${GUEST_EMAIL_DOMAIN}`);
}

/** هل وافق هذا المتصفح سابقاً صراحةً على هذه النسخة من السياسة؟ */
export function hasStoredGuestConsent(version: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(CONSENT_KEY) === version;
  } catch {
    return false;
  }
}

export function storeGuestConsent(version: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CONSENT_KEY, version);
  } catch {
    // التخزين غير متاح — يُسأل المستخدم مجدداً فى التبويب التالى، لا ضرر
  }
}

export function clearStoredGuestConsent(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CONSENT_KEY);
  } catch {
    // تجاهل
  }
}
