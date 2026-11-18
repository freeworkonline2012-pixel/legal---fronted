/**
 * ContractDraftingScreen — «صياغة العقود» (الخدمة الأولى ضمن «العقود القانونية»).
 *
 * أُنشئت 2026-11-18 بطلب صريح من المالك كخدمة جديدة باسم «صياغة العقود». لم يُحدَّد بعدُ
 * ما تفعله الخدمة (نطاقها ومدخلاتها ومخرجاتها)، فالصفحة هنا هيكل صادق «قيد الإعداد»:
 * لا تدّعى وظيفة غير موجودة ولا تجمع بيانات، وتوجّه المستخدم إلى الخدمتين العاملتين.
 * عند تحديد المواصفات تُستبدل محتوياتها بالأداة الفعلية (يبقى المسار /contract-drafting ثابتاً).
 */

'use client';

import { FilePenLine } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';

export function ContractDraftingScreen() {
  return (
    <main className="mx-auto w-full max-w-[860px] flex-1 px-4 pb-28 pt-6 sm:px-8 lg:pb-10">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <FilePenLine className="h-10 w-10 text-primary" aria-hidden="true" />
        <h1 className="text-h2 font-bold text-text-primary">صياغة العقود</h1>
        <p className="text-body text-text-secondary">إحدى خدمات «العقود القانونية».</p>
      </div>

      <div
        role="note"
        className="mb-6 rounded-lg border border-warning bg-warning-soft p-4 text-body-sm text-text-primary"
      >
        <strong className="font-semibold">قيد الإعداد:</strong> خدمة صياغة العقود لم تُفعَّل بعد، ولا تقدّم أى مخرجات
        حالياً. الخدمتان الأخريان فى القائمة تعملان كالمعتاد.
      </div>

      <section
        aria-label="الخدمات المتاحة الآن"
        className="flex flex-col items-center gap-4 rounded-lg border border-border-default bg-surface p-8 text-center"
      >
        <p className="text-body font-semibold text-text-primary">الخدمات المتاحة الآن</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <ButtonLink href="/contracts">مراجعة العقود</ButtonLink>
          <ButtonLink href="/translation" variant="secondary">
            ترجمة العقود
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
