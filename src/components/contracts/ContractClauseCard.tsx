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
import { ChevronDown, ChevronUp, MessageSquareWarning } from 'lucide-react';
import type { ContractClauseItem } from '@/lib/types';
import { ClauseAssessmentBadge } from '@/components/ui/ClauseAssessmentBadge';
import { MatchedArticleRow } from './MatchedArticleRow';

export interface ContractClauseCardProps {
  clause: ContractClauseItem;
  defaultTextExpanded?: boolean;
}

export function ContractClauseCard({ clause, defaultTextExpanded = false }: ContractClauseCardProps) {
  const [textExpanded, setTextExpanded] = useState(defaultTextExpanded);
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
