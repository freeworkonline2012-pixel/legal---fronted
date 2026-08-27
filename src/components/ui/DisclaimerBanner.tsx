/**
 * مكوّن DisclaimerBanner — إخلاء المسؤولية (component_states.md القسم 9 + P7).
 *
 * - افتراضياً مفتوح دائماً (قابل للطي عبر زر «أخفِ»/«أظهر»).
 * - يظهر في كل واجهات العرض (متطلب PRD القسم 10 — لا يُخفى أبداً).
 * - aria-label: «إخلاء مسؤولية».
 * - ⚠️ إتاحة (رصد متصفح حقيقي — جولة 25): استخدمنا `role="note"` بدل `<aside>`
 *   لأن `<aside>` (complementary landmark) كان يتسبّب في:
 *   (أ) `landmark-complementary-is-top-level` — يظهر داخل `<footer>`/`<main>`
 *       في صفحات `/` و`/login`، و
 *   (ب) `landmark-unique` — يتكرر بنفس الاسم في `/login` (داخل `<main>` + داخل
 *       `<footer>` في نفس الصفحة).
 *   إخلاء المسؤولية دلالياً «ملاحظة» (note) وليس محتوى مكمّلاً — `role="note"`
 *   يحافظ على المعنى لشاشات القراءة بلا مخالفة landmarks.
 */

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';
import { disclaimerText } from '@/lib/tokens';

export interface DisclaimerBannerProps {
  /** التحكم في الافتتاح الافتراضي — الافتراضي مفتوح دائماً (متطلب وصول) */
  defaultOpen?: boolean;
}

export function DisclaimerBanner({ defaultOpen = true }: DisclaimerBannerProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      role="note"
      aria-label="إخلاء مسؤولية"
      className="flex min-h-9 w-full items-center justify-between gap-3 rounded-md bg-surface-muted px-3 py-2"
    >
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" />
        {open ? (
          <p className="text-caption text-text-tertiary">{disclaimerText}</p>
        ) : (
          <p className="text-caption text-text-tertiary">إخلاء مسؤولية — اضغط «أظهر» للقراءة</p>
        )}
      </div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex min-h-[44px] shrink-0 items-center gap-1 px-2 text-caption font-medium text-link hover:text-primary-hover focus-visible:outline-none"
      >
        {open ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
        <span>{open ? 'أخفِ' : 'أظهر'}</span>
      </button>
    </div>
  );
}
