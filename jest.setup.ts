/**
 * إعداد بيئة اختبار Jest — يضيف مطابقات @testing-library/jest-dom
 * (toBeInTheDocument, toHaveAccessibleName, toBeDisabled …) ومعالجات بيئة
 * jsdom للمكتبات التي تعتمد على واجهات غير متوفرة في الاختبار.
 *
 * ملاحظات الأداء/الضجيج (T-TEST-HYGIENE-1):
 * 1. userEvent.setup يُعدَّل هنا ليلفّ دوال التفاعل غير المتزامنة (type/click/
 *    keyboard/…) داخل act خارجي. مع React 18.3+ كانت أحداث الإدخال المستمرة
 *    تُطلق تحديثات حالة تُسوَّى في microtask بعد خروج act الداخلي لكل حدث —
 *    فتُنتج ~469 تحذير «not wrapped in act» (~2.9MB من سجل CI) رغم نجاح كل
 *    الاختبارات. التحقق التجريبي: لفّ التفاعل في act(async) يُخفض التحذيرات
 *    من 13 إلى 0.
 * 2. IntersectionObserver و requestIdleCallback يُنمذجان no-op لأن next/link
 *    (use-intersection) يجدول تحديثات حالة عبر requestIdleCallback بعد نهاية
 *    الاختبار — مصدر 16 تحذيراً إضافياً (أُزيلت).
 */

import '@testing-library/jest-dom';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ---------------------------------------------------------------------------
// 1) userEvent: لفّ كل تفاعل (type/click/keyboard/…) داخل act خارجي
//    ---------------------------------------------------------------------
//    المشكلة: مع React 18.3+ تُطلق أحداث الإدخال المستمرة (input/change أثناء
//    الكتابة) تحديثات حالة تُسوَّى في microtask بعد خروج act الداخلي لكل حدث —
//    فتُنتج ~469 تحذير «not wrapped in act» (~2.9MB من سجل CI) رغم أن الاختبارات
//    كلها ناجحة وحتمية. التحقق التجريبي (تجربة مؤقتة على input مُتحكَّم فيه):
//    لفّ التفاعل كاملاً في act(async) يخفض التحذيرات من 13 إلى 0.
//    الحل هنا معالجة عامة: أي مثيل userEvent.setup() تُغلَّف دواله غير المتزامنة
//    بـ act — فيستفيد كل ملفات الاختبار دون تعديلها واحداً واحداً (T-TEST-HYGIENE-1).
// ---------------------------------------------------------------------------
type UserEventInstance = ReturnType<typeof userEvent.setup>;

const ASYNC_METHODS = [
  'type',
  'click',
  'dblClick',
  'tripleClick',
  'keyboard',
  'clear',
  'tab',
  'selectOptions',
  'deselectOptions',
  'upload',
  'paste',
  'hover',
  'unhover',
  'pointer',
] as const;

function wrapInAct<Args extends unknown[], R>(fn: (...args: Args) => Promise<R>) {
  return async (...args: Args): Promise<R> => {
    let result!: R;
    await act(async () => {
      result = await fn(...args);
    });
    return result;
  };
}

type UserEventSetupType = typeof userEvent.setup;
const originalUserEventSetup: UserEventSetupType = userEvent.setup.bind(userEvent);

const patchedUserEventSetup: UserEventSetupType = ((options?: Parameters<UserEventSetupType>[0]) => {
  const instance = originalUserEventSetup(options);
  const wrapped: Record<string, unknown> = {};
  for (const key of Object.keys(instance)) {
    const value = (instance as unknown as Record<string, unknown>)[key];
    const methodKey = key as (typeof ASYNC_METHODS)[number];
    wrapped[key] =
      typeof value === 'function' && ASYNC_METHODS.includes(methodKey)
        ? wrapInAct((value as (...a: unknown[]) => Promise<unknown>).bind(instance))
        : value;
  }
  return wrapped as UserEventInstance;
}) as UserEventSetupType;

// setup مُعلَنة read-only في الأنواع لكنها قابلة للكتابة فعلياً (تحقق تنفيذي:
// Object.getOwnPropertyDescriptor → writable:true) — نعيد التعيين عبر cast آمن.
(userEvent as { setup: UserEventSetupType }).setup = patchedUserEventSetup;

// ---------------------------------------------------------------------------
// 2) next/font/google لا يعمل في بيئة الاختبار — نمحّوه لأنه لا يُستخدم داخل المكوّنات
// ---------------------------------------------------------------------------
jest.mock('next/font/google', () => ({
  IBM_Plex_Sans_Arabic: () => ({ variable: '--font-ui-test' }),
  Noto_Naskh_Arabic: () => ({ variable: '--font-legal-test' }),
}));

// ---------------------------------------------------------------------------
// 3) IntersectionObserver + requestIdleCallback — next/link's use-intersection
//    يجدول تحديثات حالة بعد المونتاج؛ في الاختبار نجعلها no-op (لا تُطلق أي
//    تحديث بعد نهاية الاختبار → لا تحذيرات act ولا تسريب مهلات).
// ---------------------------------------------------------------------------
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

if (typeof window !== 'undefined') {
  window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
  window.requestIdleCallback = (() => 0) as unknown as typeof window.requestIdleCallback;
  window.cancelIdleCallback = (() => undefined) as unknown as typeof window.cancelIdleCallback;
}

// ---------------------------------------------------------------------------
// 4) matchMedia غير موجود في jsdom — نضيف نسخة مصغرة (مطلوبة في theme.tsx)
// ---------------------------------------------------------------------------
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

// scrollIntoView غير موجود في jsdom (مستخدم في ChatScreen)
if (typeof window !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined;
}
