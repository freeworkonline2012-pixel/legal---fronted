/**
 * مكوّن RatingControl — تقييم الإجابة 👍/👎 (component_states.md القسم 8 + F-08).
 *
 * - زران 44×44px، زاوية full.
 * - عند 👍 → تأكيد «شكراً — ملاحظتك تساعدنا على التحسين».
 * - عند 👎 → حقل اختياري «ما الخطأ؟» + زر إرسال (لا إجبار — أولوية UX #11).
 * - بعد الإرسال يُعطَّل الزوج (منع التقييم المزدوج) مع بقاء الاختيار مرئياً.
 * - حالات Loading (زر الإرسال) و Error («تعذّر حفظ التقييم — حاول مرة أخرى»).
 */

'use client';

import { useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import type { FeedbackPayload } from '@/lib/types';
import { Button } from './Button';
import { TextArea } from './TextArea';

export type RatingValue = 'up' | 'down';

export interface RatingControlProps {
  /** معرّف الإجابة المحفوظة (answer.id من رد POST /api/questions) */
  answerId?: string;
  /**
   * استدعاء حفظ التقييم — يُنفَّذ فعلياً عبر POST /api/feedback (عقد C-2).
   * إن لم يُمرَّر (مثلاً في الوضع التجريبي بلا answer_id) يبقى التقييم UI-only.
   */
  onSubmit?: (payload: FeedbackPayload) => Promise<void> | void;
}

function toRatingNumber(rating: RatingValue): 1 | -1 {
  return rating === 'up' ? 1 : -1;
}

export function RatingControl({ answerId, onSubmit }: RatingControlProps) {
  const [selected, setSelected] = useState<RatingValue | null>(null);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(rating: RatingValue) {
    if (submitted) return;
    setSelected(rating);
    setError(null);
    if (rating === 'up') {
      await submit(rating);
    } else {
      setShowNote(true);
    }
  }

  async function submit(rating: RatingValue, noteText?: string) {
    setLoading(true);
    setError(null);
    try {
      if (onSubmit) {
        await onSubmit({
          answer_id: answerId ?? '',
          rating: toRatingNumber(rating),
          comment: noteText,
        });
      }
      setSubmitted(true);
      setShowNote(false);
    } catch (error) {
      setError(
        error instanceof Error && error.message.includes('401')
          ? 'سجّل الدخول أولاً لتقييم الإجابة.'
          : 'تعذّر حفظ التقييم — حاول مرة أخرى',
      );
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-md bg-success-soft px-3 py-2 text-body-sm text-success" role="status">
        شكراً — ملاحظتك تساعدنا على تحسين النظام.
      </div>
    );
  }

  const selectedUp = selected === 'up';
  const selectedDown = selected === 'down';

  return (
    <div className="space-y-3">
      <p className="text-body-sm text-text-secondary">هل كانت الإجابة مفيدة؟</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-pressed={selectedUp}
          aria-label="تقييم إيجابي"
          onClick={() => handleSelect('up')}
          disabled={loading}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors duration-[120ms] focus-visible:outline-none disabled:cursor-not-allowed ${
            selectedUp
              ? 'border-success bg-success-soft text-success'
              : 'border-border-default bg-surface text-text-secondary hover:bg-primary-soft'
          }`}
        >
          <ThumbsUp className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-pressed={selectedDown}
          aria-label="تقييم سلبي"
          onClick={() => handleSelect('down')}
          disabled={loading}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors duration-[120ms] focus-visible:outline-none disabled:cursor-not-allowed ${
            selectedDown
              ? 'border-error bg-error-soft text-error'
              : 'border-border-default bg-surface text-text-secondary hover:bg-primary-soft'
          }`}
        >
          <ThumbsDown className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {showNote ? (
        <div className="space-y-2">
          <TextArea
            label="ما الخطأ؟ (اختياري)"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            placeholder="اكتب ملاحظتك لمساعدتنا على التحسين…"
          />
          <div className="flex gap-2">
            <Button size="sm" loading={loading} onClick={() => submit('down', note.trim() || undefined)}>
              إرسال الملاحظة
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowNote(false)}>
              إلغاء
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
