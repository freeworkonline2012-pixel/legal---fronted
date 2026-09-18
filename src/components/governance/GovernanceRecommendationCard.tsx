/**
 * مكوّن GovernanceRecommendationCard — طبقة النصيحة + استشهاد العقوبة لحكم الحوكمة.
 *
 * ⚠️ أُضيف 2026-09-18 — يعرض حقل `recommendation` الذى كان موجوداً فى عقد
 * backend منذ إضافته (نفس اليوم) لكن لم تُحدَّث له أى واجهة قط: اكتُشفت هذه
 * الفجوة أثناء تحقق حى يدوى للمستخدم (رجل الأعمال) — الصفحة كانت تتوقف بعد
 * آخر بطاقة GovernanceCitationCard مباشرة بلا أى أثر لتوصية أو عقوبة، رغم
 * أن الـAPI يُعيدهما بشكل صحيح ومؤكَّد (راجع "تقرير-إغلاق-فجوة-استشهاد-
 * العقوبة-تحقق-حى-نهائى..." فى توثيق المشروع). هذا المكوّن يسدّ الفجوة
 * بالكامل: advice/reasoning/conditions_for_compliance/applicable_penalties/
 * penalty_note/basis_type disclaimer/web_sources — كل حقول
 * GovernanceRecommendationDto التى كانت غير مرئية.
 *
 * قرارات تصميم متعمَّدة:
 * - violated_provisions لا يُعرض كقسم منفصل: نفس عناصر legal_basis المعروضة
 *   بالفعل كبطاقات GovernanceCitationCard أعلى هذا المكوّن — عرضه ثانية
 *   تكرار بصرى بلا قيمة إضافية (راجع تعليق الحقل فى types.ts).
 * - recommendation.confidence (رقم خام 0-1) لا يُعرض مباشرة — نفس فلسفة
 *   GovernanceAssessResponse.confidence الأساسى (تعليق backend: "لا تُعرض
 *   كضمان دقة للمستخدم مباشرة").
 * - applicable_penalties يُعاد استخدام GovernanceCitationCard له حرفياً
 *   (نفس شكل GovernanceLegalBasis تماماً) بدل بناء بطاقة جديدة مكرَّرة.
 */

'use client';

import { AlertOctagon, CircleCheck, CircleX, ExternalLink, Gavel, Globe, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { GovernanceRecommendation } from '@/lib/types';
import { GovernanceCitationCard } from './GovernanceCitationCard';

export interface GovernanceRecommendationCardProps {
  recommendation: GovernanceRecommendation;
}

type Advice = GovernanceRecommendation['advice'];

const ADVICE_ICONS: Record<Advice, LucideIcon> = {
  'موصى به': CircleCheck,
  'غير موصى به': CircleX,
  'موصى به بشرط': TriangleAlert,
};

const ADVICE_COLOR_CLASSES: Record<Advice, string> = {
  'موصى به': 'bg-success-soft text-success border-success',
  'غير موصى به': 'bg-error-soft text-error border-error',
  'موصى به بشرط': 'bg-warning-soft text-warning border-warning',
};

export function GovernanceRecommendationCard({ recommendation }: GovernanceRecommendationCardProps) {
  const Icon = ADVICE_ICONS[recommendation.advice];
  const hasPenalties = (recommendation.applicable_penalties?.length ?? 0) > 0;
  const hasConditions = (recommendation.conditions_for_compliance?.length ?? 0) > 0;
  const hasWebSources = (recommendation.web_sources?.length ?? 0) > 0;
  const isWebSupplementary = recommendation.basis_type === 'web_supplementary';

  return (
    <section aria-label="بطاقة التوصية" className="space-y-4">
      <div className="rounded-lg border border-border-default bg-surface p-5">
        <span
          role="status"
          aria-label={`التوصية: ${recommendation.advice}`}
          className={`inline-flex h-8 w-fit items-center gap-1.5 rounded-full border px-3 text-body-sm font-semibold ${ADVICE_COLOR_CLASSES[recommendation.advice]}`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          <span>{recommendation.advice}</span>
        </span>

        <p className="mt-3 text-body text-text-primary">{recommendation.reasoning}</p>

        {hasConditions ? (
          <div className="mt-4 border-t border-border-default pt-4">
            <p className="text-body-sm font-semibold text-text-primary">
              الشروط اللازمة للانتقال إلى الامتثال الكامل:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-body-sm text-text-secondary">
              {recommendation.conditions_for_compliance?.map((condition, index) => (
                <li key={index}>{condition}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {isWebSupplementary && recommendation.disclaimer ? (
          <div
            role="note"
            aria-label="تنويه توصية تكميلية من بحث ويب"
            className="mt-4 flex items-start gap-2 rounded-md border border-warning bg-warning-soft px-3 py-2"
          >
            <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <p className="text-body-sm text-text-primary">{recommendation.disclaimer}</p>
          </div>
        ) : null}

        {isWebSupplementary && hasWebSources ? (
          <div className="mt-4 border-t border-border-default pt-4">
            <p className="flex items-center gap-1.5 text-body-sm font-semibold text-text-primary">
              <Globe className="h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" />
              مصادر ويب تكميلية
            </p>
            <ul className="mt-2 space-y-2">
              {recommendation.web_sources?.map((source, index) => (
                <li key={index}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center gap-1 text-body-sm font-medium text-link underline decoration-link underline-offset-4 hover:text-primary-hover focus-visible:outline-none"
                  >
                    {source.title}
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {hasPenalties ? (
        <div className="space-y-3">
          <p className="flex items-center gap-1.5 text-body-sm font-semibold text-text-primary">
            <Gavel className="h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" />
            العقوبة المطبَّقة
          </p>
          {recommendation.penalty_note ? (
            <p className="rounded-md bg-surface-muted px-4 py-3 text-body-sm text-text-secondary">
              {recommendation.penalty_note}
            </p>
          ) : null}
          {recommendation.applicable_penalties?.map((penalty, index) => (
            <GovernanceCitationCard key={`penalty-${penalty.law_no}-${penalty.article_no}-${index}`} basis={penalty} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
