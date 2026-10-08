/**
 * مكوّن GovernancePresentationView — العرض المنظَّم لحكم الحوكمة (2026-10-05).
 *
 * يعرض `result.presentation` القادمة من الخادم (حتمية 100%، بلا نموذج لغوى):
 *  1. الجواب المباشر أولاً.
 *  2. وسم «تفسير» على الحكم نفسه مع تعليله (الحكم تطبيق من المنصة للنصوص على
 *     الواقعة، لا نص صريح؛ أما نص المادة فحرفى ويُعرض فى قسم المصادر).
 *  3. تنبيهات (منها حالة المصدر) ومسائل مفتوحة بارزة.
 *  4. ما يلزم تأكيده من وقائع/شروط.
 *
 * لا يستبدل أى بطاقة قائمة: الحكم والتوصية والمواد المستشهد بها تبقى كما هى
 * فى GovernanceScreen. وإن غابت presentation (استجابة قديمة) لا يُعرض شيء.
 */

import { AlertTriangle, ClipboardCheck, HelpCircle, Lightbulb } from 'lucide-react';
import type { GovernancePresentation } from '@/lib/types';

export interface GovernancePresentationViewProps {
  presentation: GovernancePresentation;
}

function List({ items }: { items: ReadonlyArray<string> }) {
  return (
    <ul className="mt-2 list-disc space-y-1 ps-5 text-body text-text-primary">
      {items.map((item, i) => (
        <li key={`${i}-${item}`}>{item}</li>
      ))}
    </ul>
  );
}

function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : [];
}

export function GovernancePresentationView({ presentation }: GovernancePresentationViewProps) {
  const direct = typeof presentation.direct_answer === 'string' ? presentation.direct_answer.trim() : '';
  if (direct.length === 0) return null;

  const warnings = arr(presentation.warnings);
  const openIssues = arr(presentation.open_issues);
  const facts = arr(presentation.facts_to_confirm);

  return (
    <div className="space-y-4" data-testid="governance-presentation">
      <section aria-label="الجواب المباشر" className="rounded-lg border border-primary-border bg-primary-soft p-5">
        <p className="text-caption font-semibold text-primary">الجواب المباشر</p>
        <p className="mt-1 text-body-lg font-semibold text-text-primary">{direct}</p>
        {presentation.verdict_kind ? (
          <div className="mt-3 flex items-start gap-2">
            <span
              data-testid="verdict-kind"
              className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-border-strong bg-surface-muted px-2 text-caption font-semibold text-text-primary"
            >
              <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">نوع الحكم:</span>
              <span>{presentation.verdict_kind}</span>
            </span>
            {presentation.verdict_kind_note ? (
              <p className="text-body-sm text-text-secondary">{presentation.verdict_kind_note}</p>
            ) : null}
          </div>
        ) : null}
      </section>

      {warnings.length > 0 || openIssues.length > 0 ? (
        <section aria-label="تنبيهات ومسائل مفتوحة" className="rounded-lg border border-warning bg-warning-soft p-4">
          {warnings.length > 0 ? (
            <div>
              <h3 className="flex items-center gap-2 text-h4 font-semibold text-text-primary">
                <AlertTriangle className="h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
                <span>تنبيهات</span>
              </h3>
              <List items={warnings} />
            </div>
          ) : null}
          {openIssues.length > 0 ? (
            <div className={warnings.length > 0 ? 'mt-4' : undefined}>
              <h3 className="flex items-center gap-2 text-h4 font-semibold text-text-primary">
                <HelpCircle className="h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
                <span>مسائل مفتوحة</span>
              </h3>
              <List items={openIssues} />
            </div>
          ) : null}
        </section>
      ) : null}

      {facts.length > 0 ? (
        <section aria-label="ما يلزم تأكيده" className="rounded-lg border border-border-default bg-surface p-4">
          <h3 className="flex items-center gap-2 text-h4 font-semibold text-text-primary">
            <ClipboardCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span>ما يلزم تأكيده</span>
          </h3>
          <List items={facts} />
        </section>
      ) : null}
    </div>
  );
}
