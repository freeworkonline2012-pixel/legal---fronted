/**
 * مكوّن GovernanceLawCitationGroupCard — بطاقة استشهاد مُجمَّعة على مستوى
 * القانون الواحد، لا المادة الواحدة.
 *
 * ⚠️ أُضيف 2026-09-18 (نفس يوم إضافة GovernanceRecommendationCard) بطلب
 * صريح ثانٍ من صاحب المشروع: «وضع مواد القانون الواحد فى رسالة واحدة مع
 * اتاحة الاطلاع على تلك المواد وكذلك الاطلاع على القانون». قبل هذا التعديل
 * كانت كل مادة (سواء من legal_basis أو من applicable_penalties) تُعرض فى
 * بطاقة GovernanceCitationCard منفصلة تماماً — حتى لو كانت مادتان من نفس
 * القانون تُعرضان ببطاقتين متتاليتين مكرَّرتى العنوان (اسم القانون +
 * law_no/law_year) بلا أى تجميع.
 *
 * هذا المكوّن يحل محل GovernanceCitationCard حصراً فى GovernanceScreen (لا
 * يُستبدَل GovernanceCitationCard نفسه ولا يُحذَف — يبقى موجوداً ومستخدَماً
 * فى مكانه الأصلى بمكوّنات أخرى مثل MatchedArticleRow، تفادياً لأى أثر جانبى
 * خارج نطاق هذا التعديل). راجع buildCitedLawGroups فى GovernanceScreen.tsx
 * للتجميع والترتيب.
 *
 * قرارات تصميم:
 * - عنوان القانون (law/law_no/law_year) وزر "فتح النص الرسمي" يظهران مرة
 *   واحدة فقط لكل قانون، لا لكل مادة — يفترض أن official_url متطابق عبر كل
 *   مواد نفس القانون (نأخذ قيمة أول مادة فى المجموعة).
 * - كل مادة تحتفظ بزر طى/عرض مستقل خاص بها (نفس نمط GovernanceCitationCard
 *   تماماً) — التجميع لا يعنى فقدان القدرة على الاطلاع على نص كل مادة على
 *   حدة، بل العكس: هذا شرط صريح من الطلب.
 */

'use client';

import { useId, useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Scale } from 'lucide-react';

export interface GovernanceLawCitationGroupCardProps {
  law: string;
  lawNo: number;
  lawYear: number;
  officialUrl: string | null;
  articles: Array<{ articleNo: number; snippet: string }>;
}

export function GovernanceLawCitationGroupCard({
  law,
  lawNo,
  lawYear,
  officialUrl,
  articles,
}: GovernanceLawCitationGroupCardProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, '');

  function toggle(articleNo: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(articleNo)) next.delete(articleNo);
      else next.add(articleNo);
      return next;
    });
  }

  return (
    <section aria-label="بطاقة قانون مستشهد به" className="rounded-lg border border-border-default bg-surface p-6 shadow-md">
      <div className="flex items-center gap-2">
        <Scale className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <h4 className="text-h4 font-semibold text-text-primary">
          {law} {lawNo}/{lawYear}
        </h4>
      </div>

      <div className="mt-3 divide-y divide-border-default">
        {articles.map((article) => {
          const isExpanded = expanded.has(article.articleNo);
          const legalTextId = `governance-law-group-text-${instanceId}-${lawNo}-${article.articleNo}`;
          return (
            <div key={article.articleNo} className="py-3 first:pt-0 last:pb-0">
              <p className="text-body font-medium text-text-primary">المادة {article.articleNo}</p>

              <button
                type="button"
                aria-expanded={isExpanded}
                aria-controls={legalTextId}
                onClick={() => toggle(article.articleNo)}
                className="mt-2 inline-flex min-h-[44px] items-center gap-1 text-body-sm font-semibold text-link hover:text-primary-hover focus-visible:outline-none"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                )}
                <span>{isExpanded ? 'إخفاء النص الحرفي' : 'عرض النص الحرفي'}</span>
              </button>

              {isExpanded ? (
                <div
                  id={legalTextId}
                  className="legal-text mt-2 max-h-[400px] overflow-y-auto rounded-md bg-surface-inset p-4 text-text-primary"
                >
                  {article.snippet}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        {officialUrl ? (
          <a
            href={officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-1 text-body-sm font-medium text-link underline decoration-link underline-offset-4 hover:text-primary-hover focus-visible:outline-none"
          >
            فتح النص الرسمي
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        ) : (
          <p className="text-body-sm text-text-tertiary">لا يتوفر رابط رسمي لهذا القانون حالياً.</p>
        )}
      </div>
    </section>
  );
}
