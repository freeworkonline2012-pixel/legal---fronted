/**
 * مكوّن AnswerCard — إجابة موثّقة بثقة عالية/متوسطة (S-04 في wireframes — P2).
 *
 * هرمية العرض:
 * 1. شارة الثقة (نص + أيقونة + لون — P6).
 * 2. الإجابة المبسطة (body_lg — الأهم للشخصية 1).
 * 3. «بمعنى آخر» — فقرة مبسطة إضافية داخل surface_muted.
 * 4. بطاقات الاستشهاد (عنصر تصميمي أول — P1).
 * 5. التقييم 👍/👎 + أسئلة المتابعة المقترحة.
 */

'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { QuestionAnswerResponse } from '@/lib/types';
import { postFeedback } from '@/lib/api-client';
import { getConfidenceKey } from '@/lib/normalize';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { CitationCard } from '@/components/ui/CitationCard';
import { RatingControl } from '@/components/ui/RatingControl';
import { Button } from '@/components/ui/Button';

export interface AnswerCardProps {
  answer: QuestionAnswerResponse;
  /** أسئلة متابعة مقترحة (اختياري) */
  followUpQuestions?: ReadonlyArray<string>;
  onFollowUpClick?: (question: string) => void;
  /** إظهار قسم «بمعنى آخر» */
  showPlainLanguage?: boolean;
}

export function AnswerCard({
  answer,
  followUpQuestions = [],
  onFollowUpClick,
  showPlainLanguage = true,
}: AnswerCardProps) {
  const [plainOpen, setPlainOpen] = useState(false);
  const level = getConfidenceKey(answer.confidence);
  const answerId = answer.id;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ConfidenceBadge level={level} />
      </div>

      <p className="text-body-lg text-text-primary">{answer.answer}</p>

      {showPlainLanguage ? (
        <div className="rounded-md bg-surface-muted p-4">
          <button
            type="button"
            aria-expanded={plainOpen}
            onClick={() => setPlainOpen((prev) => !prev)}
            className="inline-flex min-h-[44px] items-center gap-1 text-body-sm font-semibold text-link hover:text-primary-hover focus-visible:outline-none"
          >
            {plainOpen ? (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            )}
            <span>بمعنى آخر</span>
          </button>
          {plainOpen ? (
            <p className="mt-1 text-body text-text-secondary">
              بمعنى أبسط: إذا أنهى صاحب العمل عقدك دون سبب قانوني أو دون إشعار مسبق، فالقانون
              يمنحك حق الحصول على تعويض. هذه الصياغة توضيحية مبسطة — النص الحرفي في بطاقة
              الاستشهاد هو المرجع الدقيق.
            </p>
          ) : null}
        </div>
      ) : null}

      {answer.citations.map((citation, index) => (
        <CitationCard
          key={`${citation.law_no}-${citation.article_no}-${index}`}
          citation={citation}
        />
      ))}

      <RatingControl
        answerId={answerId}
        onSubmit={
          answerId
            ? (payload) => postFeedback(payload).then(() => undefined)
            : undefined
        }
      />

      {followUpQuestions.length > 0 ? (
        <div className="space-y-2">
          <p className="text-body-sm text-text-secondary">جرّب سؤال متابعة:</p>
          <div className="flex flex-wrap gap-2">
            {followUpQuestions.map((question) => (
              <Button
                key={question}
                variant="secondary"
                size="sm"
                onClick={() => onFollowUpClick?.(question)}
              >
                {question}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
