/**
 * مكوّن MatchedArticleRow — صف مادة قانونية واحدة مطابَقة لبند عقد (Service 2).
 *
 * نسخة أصغر من GovernanceCitationCard (مصمَّمة لتُعرَض عدة صفوف داخل بطاقة
 * بند واحدة، لا بطاقة كاملة مستقلة كما فى صفحة الحوكمة) لكن بنفس مبدأ P1:
 * النص الحرفى قابل للطى + رابط المصدر الرسمى عند توفره.
 */

'use client';

import { useId, useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Scale } from 'lucide-react';
import type { MatchedArticle } from '@/lib/types';

export interface MatchedArticleRowProps {
  article: MatchedArticle;
}

export function MatchedArticleRow({ article }: MatchedArticleRowProps) {
  const [expanded, setExpanded] = useState(false);
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const textId = `matched-article-text-${instanceId}`;

  return (
    <div className="rounded-md border border-border-default bg-surface-muted p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Scale className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="text-body-sm font-semibold text-text-primary">
          {article.law} {article.law_no}/{article.law_year} — المادة {article.article_no}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={textId}
          onClick={() => setExpanded((prev) => !prev)}
          className="inline-flex min-h-[36px] items-center gap-1 text-caption font-semibold text-link hover:text-primary-hover focus-visible:outline-none"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
          <span>{expanded ? 'إخفاء النص الحرفي' : 'عرض النص الحرفي'}</span>
        </button>
        {article.official_url ? (
          <a
            href={article.official_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[36px] items-center gap-1 text-caption font-medium text-link underline decoration-link underline-offset-4 hover:text-primary-hover focus-visible:outline-none"
          >
            فتح النص الرسمي
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        ) : null}
      </div>

      {expanded ? (
        <div id={textId} className="legal-text mt-2 max-h-[300px] overflow-y-auto rounded-md bg-surface p-3 text-text-primary">
          {article.snippet}
        </div>
      ) : null}
    </div>
  );
}
