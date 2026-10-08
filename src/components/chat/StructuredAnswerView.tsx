/**
 * مكوّن StructuredAnswerView — عرض الإجابة المنظَّمة (2026-10-05، طلب صريح
 * من صاحب المشروع: «جواب مباشر أولاً، سند عند كل حكم، تمييز نص/تفسير، حالة
 * المصدر، تحذيرات ومسائل مفتوحة بارزة، وقائع للتأكيد، نص المادة أو رابطها،
 * إيجاز — مقسَّمة بشكل احترافى يسهل قراءتها»).
 *
 * الترتيب (من الأهم للأقل، ولا يتغير):
 *  1. الجواب المباشر — أول شيء، قبل أي تفصيل.
 *  1م. وقائعك وأثرها القانونى — ما ذكره السائل فى الاستيضاح مطبَّقاً على النصوص (بعد الاستيضاح فقط).
 *  2. تطبيق على حالتك — خلاصة «إن كانت الواقعة كذا فالنتيجة كذا» بسندها (إن وُجدت).
 *  3. تنبيهات ومسائل مفتوحة — بارزة هنا لا فى آخر الإجابة.
 *  4. ما نحتاج منك تأكيده — الوقائع التى تُحوِّل الإجابة إلى قاطعة.
 *  5. الأحكام وسندها — كل حكم موسوم «نص» أو «تفسير» ومعه سنده وحالة المصدر
 *     ورابط التحقق والمقتطف الحرفى (إن ثبت آلياً).
 *  6. ما لا تغطيه النصوص المتاحة.
 *  7. المصادر مجمَّعة بحسب القانون (نص المادة قابل للطى + رابط).
 *
 * لا منطق قانونى هنا: كل القيم (الوسم، حالة المصدر، التحقق من المقتطف) تأتى
 * محسومة من الخادم؛ الواجهة تعرضها فقط وتُحصِّن نفسها من البنية الناقصة.
 */

'use client';

import { useId, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  ExternalLink,
  FileText,
  GitBranch,
  ListChecks,
  HelpCircle,
  Lightbulb,
  Scale,
  Search,
} from 'lucide-react';
import type {
  Citation,
  StructuredAnswer,
  StructuredFactApplied,
  StructuredRuling,
  StructuredScenario,
} from '@/lib/types';
import {
  articleHref,
  buildDisplaySources,
  cleanLawName,
  groupSources,
  safeHttpUrl,
  sourceStatusOf,
  type DisplaySource,
} from '@/lib/structured-answer';
import { SourceStatusChip } from '@/components/ui/SourceStatusChip';

export interface StructuredAnswerViewProps {
  structured: StructuredAnswer;
  citations: ReadonlyArray<Citation>;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-h4 font-semibold text-text-primary">{children}</h3>;
}

function BulletList({ items }: { items: ReadonlyArray<string> }) {
  return (
    <ul className="mt-2 list-disc space-y-1 ps-5 text-body text-text-primary">
      {items.map((item, i) => (
        <li key={`${i}-${item}`}>{item}</li>
      ))}
    </ul>
  );
}

function KindChip({ kind }: { kind: StructuredRuling['kind'] }) {
  const isText = kind === 'نص';
  const Icon = isText ? FileText : Lightbulb;
  const color = isText
    ? 'bg-primary-soft text-primary border-primary-border'
    : 'bg-surface-muted text-text-primary border-border-strong';
  return (
    <span
      data-testid="ruling-kind"
      data-kind={kind}
      className={`inline-flex h-6 items-center gap-1 rounded-full border px-2 text-caption font-semibold ${color}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sr-only">نوع الحكم:</span>
      <span>{kind}</span>
    </span>
  );
}

function RulingItem({
  ruling,
  citations,
  displayNo,
}: {
  ruling: StructuredRuling;
  citations: ReadonlyArray<Citation>;
  displayNo: number | undefined;
}) {
  const citation = citations[ruling.citation_index];
  const href = citation ? articleHref(citation) : null;
  const officialUrl = citation ? safeHttpUrl(citation.official_url) : null;
  const showQuote = ruling.quote_verified && ruling.quote;

  return (
    <li className="rounded-lg border border-border-default bg-surface p-4" data-testid="ruling">
      <div className="flex items-start gap-3">
        <p className="min-w-0 flex-1 text-body text-text-primary">{ruling.claim}</p>
        <KindChip kind={ruling.kind} />
      </div>

      {citation ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-text-secondary">
          <span>
            السند: <span className="font-semibold text-text-primary">[{displayNo ?? ruling.citation_index + 1}]</span>{' '}
            {cleanLawName(citation.law, citation.law_year)} {citation.law_no}/{citation.law_year} — المادة {citation.article_no}
          </span>
          <SourceStatusChip status={sourceStatusOf(citation)} />
          {href ? (
            <a
              href={href}
              className="inline-flex min-h-[44px] items-center gap-1 font-medium text-link underline decoration-link underline-offset-4 hover:text-primary-hover focus-visible:outline-none"
            >
              تحقق من نص المادة
            </a>
          ) : officialUrl ? (
            <a
              href={officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-1 font-medium text-link underline decoration-link underline-offset-4 hover:text-primary-hover focus-visible:outline-none"
            >
              فتح النص الرسمي
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      ) : null}

      {showQuote ? (
        <blockquote className="legal-text mt-3 rounded-md bg-surface-inset p-3 text-text-primary" data-testid="ruling-quote">
          <span className="block text-caption font-semibold text-text-secondary">من نص المادة:</span>
          {ruling.quote}
        </blockquote>
      ) : null}
    </li>
  );
}

function ScenarioItem({
  scenario,
  citations,
  displayNo,
}: {
  scenario: StructuredScenario;
  citations: ReadonlyArray<Citation>;
  displayNo: number | undefined;
}) {
  const citation = citations[scenario.citation_index];
  const href = citation ? articleHref(citation) : null;
  return (
    <li className="rounded-md border border-border-default bg-surface p-3" data-testid="scenario">
      <p className="text-body text-text-primary">
        <span className="font-semibold">إذا {scenario.condition}:</span> {scenario.outcome}
      </p>
      {citation ? (
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-text-secondary">
          <span>
            السند: <span className="font-semibold text-text-primary">[{displayNo ?? scenario.citation_index + 1}]</span>{' '}
            {cleanLawName(citation.law, citation.law_year)} {citation.law_no}/{citation.law_year} — المادة {citation.article_no}
          </span>
          <SourceStatusChip status={sourceStatusOf(citation)} />
          {href ? (
            <a
              href={href}
              className="inline-flex min-h-[44px] items-center font-medium text-link underline decoration-link underline-offset-4 hover:text-primary-hover focus-visible:outline-none"
            >
              تحقق من نص المادة
            </a>
          ) : null}
        </p>
      ) : null}
    </li>
  );
}

function FactAppliedItem({
  item,
  citations,
  displayNo,
}: {
  item: StructuredFactApplied;
  citations: ReadonlyArray<Citation>;
  displayNo: number | undefined;
}) {
  const citation = item.citation_index === null ? undefined : citations[item.citation_index];
  const href = citation ? articleHref(citation) : null;
  return (
    <li className="rounded-md border border-border-default bg-surface p-3" data-testid="fact-applied">
      <p className="text-body text-text-primary">
        <span className="font-semibold">{item.fact}:</span> {item.effect}
      </p>
      {citation ? (
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-text-secondary">
          <span>
            السند: <span className="font-semibold text-text-primary">[{displayNo ?? (item.citation_index ?? 0) + 1}]</span>{' '}
            {cleanLawName(citation.law, citation.law_year)} {citation.law_no}/{citation.law_year} — المادة {citation.article_no}
          </span>
          <SourceStatusChip status={sourceStatusOf(citation)} />
          {href ? (
            <a
              href={href}
              className="inline-flex min-h-[44px] items-center font-medium text-link underline decoration-link underline-offset-4 hover:text-primary-hover focus-visible:outline-none"
            >
              تحقق من نص المادة
            </a>
          ) : null}
        </p>
      ) : null}
    </li>
  );
}

function SourceGroups({ sources, instanceId }: { sources: ReadonlyArray<DisplaySource>; instanceId: string }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const groups = groupSources(sources);

  function toggle(no: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(no)) next.delete(no);
      else next.add(no);
      return next;
    });
  }

  return (
    <>
      {groups.map((group) => (
        <div key={group.key} className="rounded-lg border border-border-default bg-surface p-4">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <h4 className="text-h4 font-semibold text-text-primary">
              {group.law} {group.lawNo}/{group.lawYear}
            </h4>
          </div>
          <ul className="mt-2 divide-y divide-border-default">
            {group.entries.map(({ displayNo, citation }) => {
              const open = expanded.has(displayNo);
              const textId = `src-text-${instanceId}-${displayNo}`;
              const href = articleHref(citation);
              const officialUrl = safeHttpUrl(citation.official_url);
              return (
                <li key={displayNo} className="py-3 first:pt-0 last:pb-0" data-testid="source-item">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-body font-medium text-text-primary">
                      [{displayNo}] المادة {citation.article_no}
                    </span>
                    <SourceStatusChip status={sourceStatusOf(citation)} />
                    {href ? (
                      <a
                        href={href}
                        className="inline-flex min-h-[44px] items-center text-body-sm font-medium text-link underline decoration-link underline-offset-4 hover:text-primary-hover focus-visible:outline-none"
                      >
                        تحقق من نص المادة
                      </a>
                    ) : null}
                    {officialUrl ? (
                      <a
                        href={officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[44px] items-center gap-1 text-body-sm font-medium text-link underline decoration-link underline-offset-4 hover:text-primary-hover focus-visible:outline-none"
                      >
                        النص الرسمي
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </a>
                    ) : null}
                  </div>
                  {sourceStatusOf(citation) === 'ملغى' ? (
                    <p role="alert" className="mt-2 rounded-md bg-error-soft px-3 py-2 text-body-sm font-medium text-error">
                      هذه المادة ملغاة — لا تُعتمد
                    </p>
                  ) : null}
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={textId}
                    onClick={() => toggle(displayNo)}
                    className="mt-1 inline-flex min-h-[44px] items-center gap-1 text-body-sm font-semibold text-link hover:text-primary-hover focus-visible:outline-none"
                  >
                    {open ? (
                      <ChevronUp className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span>{open ? 'إخفاء النص الحرفي' : 'عرض النص الحرفي'}</span>
                  </button>
                  {open ? (
                    <div
                      id={textId}
                      className="legal-text mt-2 max-h-[400px] overflow-y-auto rounded-md bg-surface-inset p-4 text-text-primary"
                    >
                      {citation.snippet}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}

/**
 * المصادر: المستند إليها فى الأحكام أولاً (بأرقام تسلسلية بترتيب ظهورها)، وما
 * استُرجع ولم يستند إليه حكم فى قسم «إضافية» مطوي افتراضياً — للإيجاز: لا نعرض
 * 17 مصدراً منها 11 لا علاقة لحكم بها. إن لم يستند حكم لأى مصدر نعرض الكل.
 */
function SourcesSection({ display }: { display: ReturnType<typeof buildDisplaySources> }) {
  const [extraOpen, setExtraOpen] = useState(false);
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const { cited, extra } = display;
  if (cited.length === 0 && extra.length === 0) return null;
  const primary = cited.length > 0 ? cited : extra;
  const rest = cited.length > 0 ? extra : [];
  const extraId = `src-extra-${instanceId}`;

  return (
    <section aria-label="المصادر" className="space-y-3">
      <SectionHeading>
        {cited.length > 0 ? `المصادر المستند إليها (${cited.length})` : `المصادر (${extra.length})`}
      </SectionHeading>
      <SourceGroups sources={primary} instanceId={`${instanceId}p`} />
      {rest.length > 0 ? (
        <div>
          <button
            type="button"
            aria-expanded={extraOpen}
            aria-controls={extraId}
            onClick={() => setExtraOpen((v) => !v)}
            className="inline-flex min-h-[44px] items-center gap-1 text-body-sm font-semibold text-link hover:text-primary-hover focus-visible:outline-none"
          >
            {extraOpen ? (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            )}
            <span>
              {extraOpen ? 'إخفاء' : 'عرض'} مصادر إضافية استُرجعت ولم يستند إليها حكم ({rest.length})
            </span>
          </button>
          {extraOpen ? (
            <div id={extraId} className="mt-2 space-y-3">
              <SourceGroups sources={rest} instanceId={`${instanceId}e`} />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function StructuredAnswerView({ structured, citations }: StructuredAnswerViewProps) {
  const scenarios = useMemo(() => structured.scenarios ?? [], [structured.scenarios]);
  // ترقيم المصادر بترتيب ظهورها فى الصفحة: السيناريوهات (قبل الأحكام) ثم الأحكام.
  const factsApplied = useMemo(() => structured.facts_applied ?? [], [structured.facts_applied]);
  const display = useMemo(
    () =>
      buildDisplaySources(citations, [
        ...factsApplied.map((f) => ({ citation_index: f.citation_index ?? -1 })),
        ...scenarios,
        ...structured.rulings,
      ]),
    [citations, factsApplied, scenarios, structured.rulings],
  );
  const hasAlerts = structured.warnings.length > 0 || structured.open_issues.length > 0;

  return (
    <div className="space-y-5" data-testid="structured-answer">
      {/* 1. الجواب المباشر */}
      <section aria-label="الجواب المباشر" className="rounded-lg border border-primary-border bg-primary-soft p-5">
        <p className="text-caption font-semibold text-primary">الجواب المباشر</p>
        <p className="mt-1 text-body-lg font-semibold text-text-primary">{structured.direct_answer}</p>
      </section>

      {/* 1م. وقائعك وأثرها (بعد الاستيضاح فقط) */}
      {factsApplied.length > 0 ? (
        <section aria-label="وقائعك وأثرها القانوني" className="rounded-lg border border-border-default bg-surface-muted p-4">
          <h3 className="flex items-center gap-2 text-h4 font-semibold text-text-primary">
            <ListChecks className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span>وقائعك وأثرها القانوني</span>
          </h3>
          <p className="mt-1 text-body-sm text-text-secondary">
            ما ذكرتَه في إجاباتك مطبَّقاً على نص المادة؛ بُني عليه الجواب المباشر.
          </p>
          <ul className="mt-3 space-y-2">
            {factsApplied.map((item, index) => (
              <FactAppliedItem
                key={`${index}-${item.fact}`}
                item={item}
                citations={citations}
                displayNo={item.citation_index === null ? undefined : display.numberByOrigIndex.get(item.citation_index)}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {/* 2. تطبيق على حالتك */}
      {scenarios.length > 0 ? (
        <section aria-label="تطبيق على حالتك" className="rounded-lg border border-border-default bg-surface-muted p-4">
          <h3 className="flex items-center gap-2 text-h4 font-semibold text-text-primary">
            <GitBranch className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span>تطبيق على حالتك (بحسب وقائعها)</span>
          </h3>
          <p className="mt-1 text-body-sm text-text-secondary">
            استنتاج من نص المادة المذكورة لكل احتمال، وليس نقلاً حرفياً؛ حدّد الاحتمال الذي ينطبق عليك.
          </p>
          <ul className="mt-3 space-y-2">
            {scenarios.map((scenario, index) => (
              <ScenarioItem
                key={`${index}-${scenario.condition}`}
                scenario={scenario}
                citations={citations}
                displayNo={display.numberByOrigIndex.get(scenario.citation_index)}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {/* 3. تنبيهات ومسائل مفتوحة — بارزة */}
      {hasAlerts ? (
        <section aria-label="تنبيهات ومسائل مفتوحة" className="rounded-lg border border-warning bg-warning-soft p-4">
          {structured.warnings.length > 0 ? (
            <div>
              <h3 className="flex items-center gap-2 text-h4 font-semibold text-text-primary">
                <AlertTriangle className="h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
                <span>تنبيهات</span>
              </h3>
              <BulletList items={structured.warnings} />
            </div>
          ) : null}
          {structured.open_issues.length > 0 ? (
            <div className={structured.warnings.length > 0 ? 'mt-4' : undefined}>
              <h3 className="flex items-center gap-2 text-h4 font-semibold text-text-primary">
                <HelpCircle className="h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
                <span>مسائل مفتوحة</span>
              </h3>
              <BulletList items={structured.open_issues} />
            </div>
          ) : null}
        </section>
      ) : null}

      {/* 4. وقائع تحتاج تأكيدك */}
      {structured.facts_to_confirm.length > 0 ? (
        <section aria-label="ما نحتاج منك تأكيده" className="rounded-lg border border-border-default bg-surface p-4">
          <h3 className="flex items-center gap-2 text-h4 font-semibold text-text-primary">
            <ClipboardCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span>ما نحتاج منك تأكيده لتصير الإجابة قاطعة</span>
          </h3>
          <BulletList items={structured.facts_to_confirm} />
        </section>
      ) : null}

      {/* 5. الأحكام وسندها */}
      {structured.rulings.length > 0 ? (
        <section aria-label="الأحكام وسندها" className="space-y-3">
          <SectionHeading>الأحكام وسندها</SectionHeading>
          <p className="text-body-sm text-text-secondary">
            <span className="font-semibold text-text-primary">نص</span>: منقول من المادة ومُثبَت بمقتطف حرفي تحقّق منه النظام.{' '}
            <span className="font-semibold text-text-primary">تفسير</span>: ربط أو تطبيق على حالتك قد يختلف فيه الرأي.
          </p>
          <ul className="space-y-3">
            {structured.rulings.map((ruling, index) => (
              <RulingItem
                key={`${index}-${ruling.claim}`}
                ruling={ruling}
                citations={citations}
                displayNo={display.numberByOrigIndex.get(ruling.citation_index)}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {/* 6. ما لا تغطيه النصوص */}
      {structured.not_covered.length > 0 ? (
        <section aria-label="ما لا تغطيه النصوص المتاحة" className="rounded-lg bg-surface-muted p-4">
          <h3 className="flex items-center gap-2 text-h4 font-semibold text-text-primary">
            <Search className="h-5 w-5 shrink-0 text-text-secondary" aria-hidden="true" />
            <span>ما لا تغطيه النصوص المتاحة لدينا</span>
          </h3>
          <BulletList items={structured.not_covered} />
        </section>
      ) : null}

      {/* 7. المصادر مجمَّعة */}
      <SourcesSection display={display} />
    </div>
  );
}
