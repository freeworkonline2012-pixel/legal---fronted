/**
 * مكوّن CitationCard — بطاقة الاستشهاد (component_states.md القسم 3).
 *
 * ⚠️ أهم مكوّن في النظام — الاستشهاد عنصر تصميمي أول وليس نصاً صغيراً (P1).
 *
 * الهيكل:
 * - صف الرأس: أيقونة القانون + اسم القانون (h4).
 * - صف المادة: «المادة N» + StatusBadge (سارية/معدّلة/ملغاة).
 * - صف «آخر تعديل» + حالة النفاذ.
 * - زر «▼ النص الحرفي» يوسّع منطقة surface_inset بنص المادة بخط legal (17px/1.9).
 * - زر «فتح النص الرسمي ↗» في تبويب جديد.
 * - مادة ملغاة → تنبيه بصري إضافي «هذه المادة ملغاة — لا تُعتمد».
 * - حالة فشل التحقق → بطاقة «استشهاد قيد التحقق» (لا تُعرض كحقيقة).
 */

'use client';

import { useId, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, ExternalLink, Scale } from 'lucide-react';
import type { Citation } from '@/lib/types';
import { StatusBadge } from './StatusBadge';

export interface CitationCardProps {
  citation: Citation;
  /** الفتح الافتراضي للنص الحرفي */
  defaultExpanded?: boolean;
  /** حالة فشل تحقق الاستشهاد — تُعرض كبطاقة تحذير لا كحقيقة (نادر في المسار الطبيعي) */
  verificationFailed?: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function CitationCard({ citation, defaultExpanded = false, verificationFailed = false }: CitationCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  // معرّف فريد لكل نسخة من البطاقة — نفس المادة قد تُعرض أكثر من مرة في المحادثة،
  // وتكرار id سيكسر ربط aria-controls وصحة HTML. نُعقّم مخرجات useId (تحوي رموزاً
  // مثل «:r0:» في React 18 و««r0»» في 19) لضمان معرف HTML نظيف.
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const legalTextId = `citation-text-${instanceId}-${citation.article_no}-${citation.law_no}`;

  if (verificationFailed) {
    return (
      <section
        aria-label="استشهاد قيد التحقق"
        className="rounded-lg border border-border-default bg-surface p-6 shadow-md"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
          <div>
            <h4 className="text-h4 font-semibold text-text-primary">استشهاد قيد التحقق</h4>
            <p className="mt-1 text-body-sm text-text-secondary">
              لم يكتمل التحقق من هذا المصدر آلياً — لن يُعرض كمعلومة نهائية.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const isRepealed = citation.status === 'repealed';

  return (
    <section aria-label="بطاقة استشهاد" className="rounded-lg border border-border-default bg-surface p-6 shadow-md">
      {/* رأس البطاقة: القانون */}
      <div className="flex items-center gap-2">
        <Scale className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <h4 className="text-h4 font-semibold text-text-primary">
          {citation.law} {citation.law_no}/{citation.law_year}
        </h4>
      </div>

      {/* المادة + حالة النفاذ */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <p className="text-body font-medium text-text-primary">المادة {citation.article_no}</p>
        <StatusBadge status={citation.status} />
      </div>

      {/* آخر تعديل */}
      <p className="mt-2 text-body-sm text-text-secondary">
        آخر تعديل: <span dir="ltr">{formatDate(citation.last_amended)}</span>
      </p>

      {isRepealed ? (
        <p role="alert" className="mt-3 rounded-md bg-error-soft px-3 py-2 text-body-sm font-medium text-error">
          ⚠️ هذه المادة ملغاة — لا تُعتمد
        </p>
      ) : null}

      {/* النص الحرفي القابل للطي */}
      <div className="mt-4">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={legalTextId}
          onClick={() => setExpanded((prev) => !prev)}
          className="inline-flex min-h-[44px] items-center gap-1 text-body-sm font-semibold text-link hover:text-primary-hover focus-visible:outline-none"
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          )}
          <span>{expanded ? 'إخفاء النص الحرفي' : 'عرض النص الحرفي'}</span>
        </button>

        {expanded ? (
          <div
            id={legalTextId}
            className="legal-text mt-2 max-h-[400px] overflow-y-auto rounded-md bg-surface-inset p-4 text-text-primary"
          >
            {citation.snippet}
          </div>
        ) : null}
      </div>

      {/* الرابط الرسمي — يُعرض فقط عند وجود قيمة (official_url nullable في عقد backend) */}
      <div className="mt-4">
        {citation.official_url ? (
          <a
            href={citation.official_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-1 text-body-sm font-medium text-link underline decoration-link underline-offset-4 hover:text-primary-hover focus-visible:outline-none"
          >
            فتح النص الرسمي
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        ) : (
          <p className="text-body-sm text-text-tertiary">لا يتوفر رابط رسمي لهذه المادة حالياً.</p>
        )}
      </div>
    </section>
  );
}
