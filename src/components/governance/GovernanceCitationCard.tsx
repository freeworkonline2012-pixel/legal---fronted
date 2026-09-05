/**
 * مكوّن GovernanceCitationCard — بطاقة أساس قانونى لحكم الحوكمة.
 *
 * ⚠️ نسخة أضيق عمداً من CitationCard (components/ui): عقد backend لهذه
 * الخدمة (GovernanceLegalBasisDto) لا يحمل status/last_amended إطلاقاً —
 * فرض StatusBadge هنا كان سيتطلب قيمة وهمية غير موجودة فى الاستجابة الفعلية.
 * يبقى نفس مبدأ P1 (الاستشهاد عنصر تصميمي أول لا نص صغير) والنص الحرفى
 * القابل للطى وزر «فتح النص الرسمي» عند توفر الرابط.
 */

'use client';

import { useId, useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Scale } from 'lucide-react';
import type { GovernanceLegalBasis } from '@/lib/types';

export interface GovernanceCitationCardProps {
  basis: GovernanceLegalBasis;
  defaultExpanded?: boolean;
}

export function GovernanceCitationCard({ basis, defaultExpanded = false }: GovernanceCitationCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const legalTextId = `governance-basis-text-${instanceId}-${basis.article_no}-${basis.law_no}`;

  return (
    <section aria-label="بطاقة أساس قانونى" className="rounded-lg border border-border-default bg-surface p-6 shadow-md">
      <div className="flex items-center gap-2">
        <Scale className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <h4 className="text-h4 font-semibold text-text-primary">
          {basis.law} {basis.law_no}/{basis.law_year}
        </h4>
      </div>

      <p className="mt-3 text-body font-medium text-text-primary">المادة {basis.article_no}</p>

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
            {basis.snippet}
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        {basis.official_url ? (
          <a
            href={basis.official_url}
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
