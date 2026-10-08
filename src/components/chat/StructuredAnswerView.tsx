/**
 * مكوّن StructuredAnswerView — عرض الإجابة المنظَّمة (2026-10-05، طلب صريح
 * من صاحب المشروع: «جواب مباشر أولاً، سند عند كل حكم، تمييز نص/تفسير، حالة
 * المصدر، تحذيرات ومسائل مفتوحة بارزة، وقائع للتأكيد، نص المادة أو رابطها،
 * إيجاز — مقسَّمة بشكل احترافى يسهل قراءتها»).
 *
 * الترتيب (من الأهم للأقل، ولا يتغير):
 *  1. الجواب المباشر — أول شيء، قبل أي تفصيل.
 *  2. تنبيهات ومسائل مفتوحة — بارزة هنا لا فى آخر الإجابة.
 *  3. ما نحتاج منك تأكيده — الوقائع التى تُحوِّل الإجابة إلى قاطعة.
 *  4. الأحكام وسندها — كل حكم موسوم «نص» أو «تفسير» ومعه سنده وحالة المصدر
 *     ورابط التحقق والمقتطف الحرفى (إن ثبت آلياً).
 *  5. ما لا تغطيه النصوص المتاحة.
 *  6. المصادر مجمَّعة بحسب القانون (نص المادة قابل للطى + رابط).
 *
 * لا منطق قانونى هنا: كل القيم (الوسم، حالة المصدر، التحقق من المقتطف) تأتى
 * محسومة من الخادم؛ الواجهة تعرضها فقط وتُحصِّن نفسها من البنية الناقصة.
 */

'use client';

import { useId, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  ExternalLink,
  FileText,
  HelpCircle,
  Lightbulb,
  Scale,
  Search,
} from 'lucide-react';
import type { Citation, StructuredAnswer, StructuredRuling } from '@/lib/types';
import { articleHref, groupCitationsByLaw, safeHttpUrl, sourceStatusOf } from '@/lib/structured-answer';
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

function RulingItem({ ruling, citations }: { ruling: StructuredRuling; citations: ReadonlyArray<Citation> }) {
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
            السند: <span className="font-semibold text-text-primary">[{ruling.citation_index + 1}]</span> {citation.law}{' '}
            {citation.law_no}/{citation.law_year} — المادة {citation.article_no}
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

function SourcesSection({ citations }: { citations: ReadonlyArray<Citation> }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const groups = groupCitationsByLaw(citations);
  if (groups.length === 0) return null;

  function toggle(index: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <section aria-label="المصادر" className="space-y-3">
      <SectionHeading>المصادر ({citations.length})</SectionHeading>
      {groups.map((group) => (
        <div key={group.key} className="rounded-lg border border-border-default bg-surface p-4">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <h4 className="text-h4 font-semibold text-text-primary">
              {group.law} {group.lawNo}/{group.lawYear}
            </h4>
          </div>
          <ul className="mt-2 divide-y divide-border-default">
            {group.entries.map(({ index, citation }) => {
              const open = expanded.has(index);
              const textId = `src-text-${instanceId}-${index}`;
              const href = articleHref(citation);
              const officialUrl = safeHttpUrl(citation.official_url);
              return (
                <li key={index} className="py-3 first:pt-0 last:pb-0" data-testid="source-item">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-body font-medium text-text-primary">
                      [{index + 1}] المادة {citation.article_no}
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
                    onClick={() => toggle(index)}
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
    </section>
  );
}

export function StructuredAnswerView({ structured, citations }: StructuredAnswerViewProps) {
  const hasAlerts = structured.warnings.length > 0 || structured.open_issues.length > 0;

  return (
    <div className="space-y-5" data-testid="structured-answer">
      {/* 1. الجواب المباشر */}
      <section aria-label="الجواب المباشر" className="rounded-lg border border-primary-border bg-primary-soft p-5">
        <p className="text-caption font-semibold text-primary">الجواب المباشر</p>
        <p className="mt-1 text-body-lg font-semibold text-text-primary">{structured.direct_answer}</p>
      </section>

      {/* 2. تنبيهات ومسائل مفتوحة — بارزة */}
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

      {/* 3. وقائع تحتاج تأكيدك */}
      {structured.facts_to_confirm.length > 0 ? (
        <section aria-label="ما نحتاج منك تأكيده" className="rounded-lg border border-border-default bg-surface p-4">
          <h3 className="flex items-center gap-2 text-h4 font-semibold text-text-primary">
            <ClipboardCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span>ما نحتاج منك تأكيده لتصير الإجابة قاطعة</span>
          </h3>
          <BulletList items={structured.facts_to_confirm} />
        </section>
      ) : null}

      {/* 4. الأحكام وسندها */}
      {structured.rulings.length > 0 ? (
        <section aria-label="الأحكام وسندها" className="space-y-3">
          <SectionHeading>الأحكام وسندها</SectionHeading>
          <p className="text-body-sm text-text-secondary">
            <span className="font-semibold text-text-primary">نص</span>: منقول من المادة ومُثبَت بمقتطف حرفي تحقّق منه النظام.{' '}
            <span className="font-semibold text-text-primary">تفسير</span>: ربط أو تطبيق على حالتك قد يختلف فيه الرأي.
          </p>
          <ul className="space-y-3">
            {structured.rulings.map((ruling, index) => (
              <RulingItem key={`${index}-${ruling.claim}`} ruling={ruling} citations={citations} />
            ))}
          </ul>
        </section>
      ) : null}

      {/* 5. ما لا تغطيه النصوص */}
      {structured.not_covered.length > 0 ? (
        <section aria-label="ما لا تغطيه النصوص المتاحة" className="rounded-lg bg-surface-muted p-4">
          <h3 className="flex items-center gap-2 text-h4 font-semibold text-text-primary">
            <Search className="h-5 w-5 shrink-0 text-text-secondary" aria-hidden="true" />
            <span>ما لا تغطيه النصوص المتاحة لدينا</span>
          </h3>
          <BulletList items={structured.not_covered} />
        </section>
      ) : null}

      {/* 6. المصادر مجمَّعة */}
      <SourcesSection citations={citations} />
    </div>
  );
}
