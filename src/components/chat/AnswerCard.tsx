/**
 * مكوّن AnswerCard — إجابة موثّقة بالاستشهادات (S-04 في wireframes — P2).
 *
 * مساران للعرض:
 * 1. إجابة منظَّمة (answer.structured صالحة) — 2026-10-05: جواب مباشر أولاً،
 *    تنبيهات ومسائل مفتوحة، وقائع للتأكيد، أحكام موسومة «نص/تفسير» بسندها
 *    وحالة المصدر، ثم المصادر مجمَّعة (راجع StructuredAnswerView).
 * 2. الشكل القديم (لا structured، أو بنية غير صالحة، أو سجل قديم): الإجابة
 *    النصية ثم بطاقات الاستشهاد — بلا أى تغيير فى سلوكه.
 * وفى الحالتين بعدها: التقييم 👍/👎 + أسئلة المتابعة المقترحة.
 *
 * إزالة قسم «بمعنى آخر» (2026-10-05): كان نصاً ثابتاً مكتوباً يدوياً عن «إنهاء
 * العقد دون سبب أو إشعار» يظهر تحت **كل** إجابة أياً كان سؤالها (إيجار، مرور،
 * أحوال شخصية…) — شرح غير مرتبط بالسؤال وقد يضلّل. لا يُعاد إلا بتوليد حقيقى
 * من الخادم لكل إجابة على حدة.
 *
 * "إلغاء بادج الثقة بالكامل" (2026-09-25 — قرار صريح من رجل الأعمال): شارة
 * الثقة أُزيلت كلياً. راجع تعليق QuestionAnswerResponse فى lib/types.ts.
 */

'use client';

import { useMemo } from 'react';
import type { QuestionAnswerResponse } from '@/lib/types';
import { postFeedback } from '@/lib/api-client';
import { parseStructuredAnswer } from '@/lib/structured-answer';
import { CitationCard } from '@/components/ui/CitationCard';
import { RatingControl } from '@/components/ui/RatingControl';
import { Button } from '@/components/ui/Button';
import { StructuredAnswerView } from './StructuredAnswerView';

export interface AnswerCardProps {
  answer: QuestionAnswerResponse;
  /** أسئلة متابعة مقترحة (اختياري) */
  followUpQuestions?: ReadonlyArray<string>;
  onFollowUpClick?: (question: string) => void;
}

export function AnswerCard({ answer, followUpQuestions = [], onFollowUpClick }: AnswerCardProps) {
  const answerId = answer.id;
  const structured = useMemo(() => parseStructuredAnswer(answer.structured), [answer.structured]);

  return (
    <div className="space-y-4">
      {structured ? (
        <StructuredAnswerView structured={structured} citations={answer.citations} />
      ) : (
        <>
          <p className="text-body-lg text-text-primary">{answer.answer}</p>

          {answer.citations.map((citation, index) => (
            <CitationCard
              key={`${citation.law_no}-${citation.article_no}-${index}`}
              citation={citation}
            />
          ))}
        </>
      )}

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
