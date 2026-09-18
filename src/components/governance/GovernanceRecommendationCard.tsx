/**
 * مكوّن GovernanceRecommendationCard — بطاقة الحكم + التوصية المدموجة لحكم
 * الحوكمة.
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
 * ⚠️ تعديل هيكلى أول 2026-09-18 (دفعة إعادة ترتيب الواجهة): بطاقات استشهاد
 * applicable_penalties (GovernanceCitationCard) لم تعد تُعرض هنا — انتقلت
 * لقسم موحَّد فى GovernanceScreen. هذا المكوّن يعرض فقط نص العقوبة
 * (penalty_note) كملاحظة. كذلك أُضيفت شارة «موثوق/غير موثوق» بجانب شارة
 * التوصية، مشتقة من basis_type: 'database' → موثوق، 'web_supplementary' →
 * غير موثوق. التنويه النصى الكامل لحالة web_supplementary (disclaimer) ظل
 * موجوداً كما هو.
 *
 * ⚠️ تعديل هيكلى ثانٍ 2026-09-18 (بطلب صريح من صاحب المشروع: «دمج الرد مع
 * التوصية بحيث يكون الرد على المستخدم... غير متوافق وغير موصى به مع الشرح»):
 * هذا المكوّن أصبح يستقبل `verdict` أيضاً ويعرض شارتى الحكم والتوصية معاً فى
 * صف واحد («غير متوافق» و«غير موصى به»)، بدل بطاقتين منفصلتين (بطاقة حكم
 * قائمة بذاتها فى GovernanceScreen + هذه البطاقة). السبب العملى الأهم: عند
 * توفر recommendation، لوحظ حياً أن `result.risk_note` (نص عام تحت شارة
 * الحكم) و`recommendation.reasoning` (نص تحت شارة التوصية) يحملان نفس
 * الشرح القانونى المفصَّل حرفياً — عرضهما منفصلين كان يُكرِّر نفس الفقرة
 * الطويلة مرتين على الصفحة. الحل: عند دمج البطاقتين (أى كلما توفَّر
 * recommendation)، يُعرَض reasoning فقط كشرح وحيد، ويُسقَط risk_note عمداً
 * هنا لتفادى هذا التكرار — GovernanceScreen ما زال يعرض risk_note بمفرده
 * فى حالة عدم توفر recommendation (استجابات قديمة أو حكم "معلومات غير
 * كافية")، حيث لا يوجد نص توصية بديل أصلاً. الجملة القصيرة النمطية التى
 * كانت تعرضها GovernanceVerdictBadge (VERDICT_DESCRIPTIONS، مثل "الإجراء
 * المذكور يخالف النص القانونى المسترجَع صراحة.") أيضاً أُسقِطت من الحالة
 * المدموجة تحديداً لنفس السبب — reasoning التفصيلى يجعلها حشواً زائداً
 * مباشرة فوقه. GovernanceVerdictBadge نفسه لم يُعدَّل ولم يُحذَف — يبقى
 * مستخدَماً كما هو فى GovernanceScreen لحالة عدم توفر recommendation.
 *
 * قرارات تصميم متعمَّدة (لم تتغيّر):
 * - violated_provisions لا يُعرض كقسم منفصل: نفس عناصر legal_basis المعروضة
 *   بالفعل ضمن قسم الاستشهادات الموحَّد — عرضه ثانية تكرار بصرى بلا قيمة
 *   إضافية (راجع تعليق الحقل فى types.ts).
 * - recommendation.confidence (رقم خام 0-1) لا يُعرض مباشرة — نفس فلسفة
 *   GovernanceAssessResponse.confidence الأساسى (تعليق backend: "لا تُعرض
 *   كضمان دقة للمستخدم مباشرة").
 */

'use client';

import {
  AlertOctagon,
  CircleCheck,
  CircleHelp,
  CircleX,
  ExternalLink,
  Gavel,
  Globe,
  ShieldCheck,
  ShieldX,
  TriangleAlert,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { GovernanceRecommendation, GovernanceVerdict } from '@/lib/types';

export interface GovernanceRecommendationCardProps {
  verdict: GovernanceVerdict;
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

/** مطابقة لـVERDICT_ICONS/VERDICT_COLOR_CLASSES فى GovernanceVerdictBadge —
 * مكرَّرة محلياً عمداً بدل استيراد تلك الخرائط (غير مُصدَّرة من ذلك الملف)،
 * لتفادى تغيير الواجهة العامة لمكوّن مستخدَم أيضاً بمفرده فى حالة عدم توفر
 * recommendation. */
const VERDICT_ICONS: Record<GovernanceVerdict, LucideIcon> = {
  'متوافق': CircleCheck,
  'غير متوافق': CircleX,
  'متوافق جزئياً': TriangleAlert,
  'معلومات غير كافية': CircleHelp,
};

const VERDICT_COLOR_CLASSES: Record<GovernanceVerdict, string> = {
  'متوافق': 'bg-success-soft text-success border-success',
  'غير متوافق': 'bg-error-soft text-error border-error',
  'متوافق جزئياً': 'bg-warning-soft text-warning border-warning',
  'معلومات غير كافية': 'bg-primary-soft text-primary border-primary-border',
};

export function GovernanceRecommendationCard({ verdict, recommendation }: GovernanceRecommendationCardProps) {
  const VerdictIcon = VERDICT_ICONS[verdict];
  const AdviceIcon = ADVICE_ICONS[recommendation.advice];
  const hasConditions = (recommendation.conditions_for_compliance?.length ?? 0) > 0;
  const hasWebSources = (recommendation.web_sources?.length ?? 0) > 0;
  const isWebSupplementary = recommendation.basis_type === 'web_supplementary';
  const showPenaltySection =
    Boolean(recommendation.penalty_note) || (recommendation.applicable_penalties?.length ?? 0) > 0;

  const TrustIcon = isWebSupplementary ? ShieldX : ShieldCheck;
  const trustLabel = isWebSupplementary ? 'غير موثوق' : 'موثوق';
  const trustColorClasses = isWebSupplementary
    ? 'bg-warning-soft text-warning border-warning'
    : 'bg-success-soft text-success border-success';

  return (
    <section aria-label="بطاقة الحكم والتوصية" className="space-y-4">
      <div className="rounded-lg border border-border-default bg-surface p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            role="status"
            aria-label={`الحكم: ${verdict}`}
            className={`inline-flex h-8 w-fit items-center gap-1.5 rounded-full border px-3 text-body-sm font-semibold ${VERDICT_COLOR_CLASSES[verdict]}`}
          >
            <VerdictIcon className="h-4 w-4" aria-hidden="true" />
            <span>{verdict}</span>
          </span>

          <span className="text-body-sm font-semibold text-text-tertiary" aria-hidden="true">
            و
          </span>

          <span
            role="status"
            aria-label={`التوصية: ${recommendation.advice}`}
            className={`inline-flex h-8 w-fit items-center gap-1.5 rounded-full border px-3 text-body-sm font-semibold ${ADVICE_COLOR_CLASSES[recommendation.advice]}`}
          >
            <AdviceIcon className="h-4 w-4" aria-hidden="true" />
            <span>{recommendation.advice}</span>
          </span>

          <span
            role="status"
            aria-label={`مصدر التوصية: ${trustLabel}`}
            className={`inline-flex h-8 w-fit items-center gap-1.5 rounded-full border px-3 text-body-sm font-semibold ${trustColorClasses}`}
          >
            <TrustIcon className="h-4 w-4" aria-hidden="true" />
            <span>{trustLabel}</span>
          </span>
        </div>

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

        {showPenaltySection ? (
          <div className="mt-4 border-t border-border-default pt-4">
            <p className="flex items-center gap-1.5 text-body-sm font-semibold text-text-primary">
              <Gavel className="h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" />
              العقوبة المطبَّقة
            </p>
            {recommendation.penalty_note ? (
              <p className="mt-2 rounded-md bg-surface-muted px-4 py-3 text-body-sm text-text-secondary">
                {recommendation.penalty_note}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
