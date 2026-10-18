/**
 * مكوّن ContractClauseCard — بطاقة بند واحد من عقد مُرفوع (Service 2، Phase 1+2).
 *
 * يعرض: تسمية البند كما وردت حرفياً فى العقد الأصلى + عنوانه الصريح (إن
 * وُجد) + شارة التقييم (سليم/يحتاج مراجعة/لا يوجد نص مفهرَس) + سبب التقييم +
 * قائمة المواد القانونية المطابَقة (إن وُجدت) + نص البند الكامل (قابل للطى —
 * قد يكون طويلاً، ونفس مبدأ P1 لا يمنع طيّه هنا لأنه ليس "الاستشهاد" نفسه بل
 * سياقه المصدر).
 */

'use client';

import { useId, useState } from 'react';
import { ChevronDown, ChevronUp, MessageSquareWarning, PenLine } from 'lucide-react';
import type { ContractClauseItem, SuggestedRedraft } from '@/lib/types';
import { ApiError, proposeClauseRedraft } from '@/lib/api-client';
import { criteriaLabels } from '@/lib/contract-criteria';
import { Button } from '@/components/ui/Button';
import { ClauseAssessmentBadge } from '@/components/ui/ClauseAssessmentBadge';
import { MatchedArticleRow } from './MatchedArticleRow';

export interface ContractClauseCardProps {
  clause: ContractClauseItem;
  defaultTextExpanded?: boolean;
  /** معرّف العقد — لازم لزر الصياغة المقترحة (يُخفى الزر إن غاب) */
  contractId?: string;
}

export function ContractClauseCard({ clause, defaultTextExpanded = false, contractId }: ContractClauseCardProps) {
  const [textExpanded, setTextExpanded] = useState(defaultTextExpanded);
  const [redraft, setRedraft] = useState<SuggestedRedraft | null>(clause.suggested_redraft ?? null);
  const [redraftLoading, setRedraftLoading] = useState(false);
  const [redraftError, setRedraftError] = useState<string | null>(null);
  const labels = criteriaLabels(clause.clause_type_guess);
  const canRedraft =
    Boolean(contractId) &&
    clause.assessment_status === 'يحتاج مراجعة' &&
    (clause.matched_articles?.length ?? 0) > 0;

  async function handleRedraft() {
    if (!contractId) return;
    setRedraftLoading(true);
    setRedraftError(null);
    try {
      const updated = await proposeClauseRedraft(contractId, clause.id);
      setRedraft(updated.suggested_redraft ?? null);
      if (!updated.suggested_redraft) setRedraftError('لم تُرجِع الخدمة صياغة مقترحة لهذا البند.');
    } catch (err) {
      setRedraftError(err instanceof ApiError ? err.message : 'تعذّر توليد الصياغة المقترحة الآن.');
    } finally {
      setRedraftLoading(false);
    }
  }
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const clauseTextId = `clause-text-${instanceId}`;

  return (
    <section
      aria-label={`بطاقة ${clause.clause_label}`}
      className="rounded-lg border border-border-default bg-surface p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-h4 font-semibold text-text-primary">{clause.clause_label}</h4>
          {clause.clause_title ? (
            <p className="mt-0.5 text-body-sm text-text-secondary">{clause.clause_title}</p>
          ) : null}
          {labels.length > 0 ? (
            <ul aria-label="معايير المراجعة المرتبطة بالبند" className="mt-2 flex flex-wrap gap-1.5">
              {labels.map((label) => (
                <li
                  key={label}
                  className="rounded-full bg-surface-muted px-2.5 py-0.5 text-caption text-text-secondary"
                >
                  {label}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {clause.assessment_status ? <ClauseAssessmentBadge status={clause.assessment_status} /> : null}
      </div>

      {clause.assessment_reasoning ? (
        <div className="mt-3 flex items-start gap-2 border-t border-border-default pt-3">
          <MessageSquareWarning className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" />
          <p className="text-body-sm text-text-secondary">{clause.assessment_reasoning}</p>
        </div>
      ) : null}

      {clause.matched_articles && clause.matched_articles.length > 0 ? (
        <div className="mt-3 space-y-2">
          {clause.matched_articles.map((article, index) => (
            <MatchedArticleRow key={`${article.law_no}-${article.law_year}-${article.article_no}-${index}`} article={article} />
          ))}
        </div>
      ) : null}

      {canRedraft ? (
        <div className="mt-3 border-t border-border-default pt-3">
          {redraft ? (
            <div role="region" aria-label="صياغة مقترحة للبند" className="rounded-md bg-primary-soft p-4">
              <h5 className="flex items-center gap-1.5 text-body-sm font-semibold text-text-primary">
                <PenLine className="h-4 w-4" aria-hidden="true" />
                صياغة مقترحة
              </h5>
              <p className="legal-text mt-2 whitespace-pre-line text-text-primary">{redraft.text}</p>
              {redraft.changes.length > 0 ? (
                <ul className="mt-3 list-disc space-y-1 pe-5 text-body-sm text-text-secondary">
                  {redraft.changes.map((change, i) => (
                    <li key={i}>{change}</li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-3 text-caption text-text-tertiary">{redraft.disclaimer}</p>
            </div>
          ) : (
            <Button variant="secondary" size="sm" loading={redraftLoading} onClick={handleRedraft}>
              اقترح صياغة بديلة
            </Button>
          )}
          {redraftError ? (
            <p role="alert" className="mt-2 text-body-sm text-error">
              {redraftError}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3">
        <button
          type="button"
          aria-expanded={textExpanded}
          aria-controls={clauseTextId}
          onClick={() => setTextExpanded((prev) => !prev)}
          className="inline-flex min-h-[44px] items-center gap-1 text-body-sm font-semibold text-link hover:text-primary-hover focus-visible:outline-none"
        >
          {textExpanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
          <span>{textExpanded ? 'إخفاء نص البند' : 'عرض نص البند كاملاً'}</span>
        </button>
        {textExpanded ? (
          <div id={clauseTextId} className="legal-text mt-2 rounded-md bg-surface-inset p-4 text-text-primary">
            {clause.clause_text}
          </div>
        ) : null}
      </div>
    </section>
  );
}
