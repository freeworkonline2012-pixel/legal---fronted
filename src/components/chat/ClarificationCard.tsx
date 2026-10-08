/**
 * مكوّن ClarificationCard — أسئلة الاستيضاح قبل الإجابة (المرحلة 2).
 *
 * حين يكون السؤال مبهماً أو مركباً أو ناقص الوقائع تسأل المنصة بدل التخمين:
 * - لكل سؤال خيارات (اختيار مفرد أو متعدد) + «أخرى» بصياغة السائل + «لا أعرف».
 * - «إرسال الإجابات» يتفعّل عند الإجابة عن كل الأسئلة؛ «تخطَّ وأجبنى مباشرة» متاح دائماً.
 * - إشعار حماية بيانات: يكفى وصف الواقعة، لا أسماء ولا أرقام شخصية.
 * - بعد الإرسال تتحول البطاقة إلى ملخص للقراءة فقط (resolvedAnswers).
 */

'use client';

import { useState } from 'react';
import { HelpCircle, ShieldCheck } from 'lucide-react';
import type { ClarificationAnswerPayload, ClarificationRequest } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import {
  EMPTY_SELECTION,
  buildAnswerPayloads,
  chooseUnknown,
  isAnswered,
  setOtherText,
  toggleOption,
  toggleOther,
  type QuestionSelection,
} from '@/lib/clarification';

export interface ClarificationCardProps {
  request: ClarificationRequest;
  onSubmit: (answers: ClarificationAnswerPayload[]) => void;
  onSkip: () => void;
  /** تعطيل التفاعل أثناء إرسال الطلب */
  disabled?: boolean;
  /** إن وُجدت: البطاقة أُجيبت/تُخطّيت وتُعرض للقراءة فقط */
  resolvedAnswers?: ClarificationAnswerPayload[] | 'skipped' | 'superseded';
}

const RADIO_CLASS = 'h-4 w-4 shrink-0 accent-[var(--color-primary)]';
const OPTION_LABEL_CLASS =
  'flex min-h-[44px] cursor-pointer items-start gap-3 rounded-md border border-border-default bg-surface px-3 py-2.5 ' +
  'text-body-sm text-text-primary hover:border-border-strong has-[:checked]:border-primary has-[:checked]:bg-primary-soft';

export function ClarificationCard({ request, onSubmit, onSkip, disabled = false, resolvedAnswers }: ClarificationCardProps) {
  const [selections, setSelections] = useState<Record<string, QuestionSelection>>({});

  if (resolvedAnswers) {
    return (
      <div className="space-y-2" data-testid="clarification-resolved">
        <p className="flex items-center gap-2 text-body-sm font-medium text-text-secondary">
          <HelpCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {resolvedAnswers === 'skipped'
            ? 'تخطّيت أسئلة التوضيح — أُجيب بما فى سؤالك.'
            : resolvedAnswers === 'superseded'
              ? 'انتقلت إلى سؤال جديد — لم تعد هذه الأسئلة مطلوبة.'
              : 'توضيحاتك'}
        </p>
        {typeof resolvedAnswers === 'string' ? null : (
          <ul className="space-y-1 text-body-sm text-text-primary">
            {resolvedAnswers.map((a) => (
              <li key={a.question}>
                <span className="text-text-secondary">{a.question}</span>{' '}
                <span className="font-medium">{a.kind === 'unknown' ? 'لا أعرف' : a.answer}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const payloads = buildAnswerPayloads(request.questions, selections);
  const canSubmit = payloads !== null && !disabled;

  function update(id: string, fn: (s: QuestionSelection) => QuestionSelection) {
    setSelections((prev) => ({ ...prev, [id]: fn(prev[id] ?? EMPTY_SELECTION) }));
  }

  return (
    <form
      className="space-y-5"
      aria-label="أسئلة توضيحية"
      onSubmit={(event) => {
        event.preventDefault();
        if (payloads && !disabled) onSubmit(payloads);
      }}
    >
      <div className="space-y-1">
        <p className="flex items-center gap-2 text-body-lg font-medium text-text-primary">
          <HelpCircle className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          لأجيبك بدقة أحتاج إلى بعض التوضيحات
        </p>
        <p className="text-caption text-text-secondary">
          الجولة {request.round} من {request.max_rounds} — اختر الأنسب لحالتك، أو اكتب إجابتك بنفسك.
        </p>
      </div>

      {request.questions.map((q, index) => {
        const sel = selections[q.id] ?? EMPTY_SELECTION;
        const type = q.allow_multiple ? 'checkbox' : 'radio';
        const name = `clarification-${request.round}-${q.id}`;
        const answered = isAnswered(sel);
        return (
          <fieldset key={q.id} className="space-y-2" disabled={disabled}>
            <legend className="mb-1 text-body font-medium text-text-primary">
              {index + 1}. {q.question}
              {q.allow_multiple ? <span className="ms-2 text-caption font-normal text-text-secondary">(يمكنك اختيار أكثر من إجابة)</span> : null}
            </legend>
            {q.why ? <p className="text-caption text-text-secondary">{q.why}</p> : null}

            <div className="grid gap-2">
              {q.options.map((option) => (
                <label key={option} className={OPTION_LABEL_CLASS}>
                  <input
                    type={type}
                    name={name}
                    className={RADIO_CLASS}
                    checked={sel.selected.includes(option)}
                    onChange={() => update(q.id, (s) => toggleOption(s, option, q.allow_multiple))}
                  />
                  <span>{option}</span>
                </label>
              ))}

              <label className={OPTION_LABEL_CLASS}>
                <input
                  type={type}
                  name={name}
                  className={RADIO_CLASS}
                  checked={sel.other}
                  onChange={() => update(q.id, (s) => toggleOther(s, q.allow_multiple))}
                />
                <span>أخرى (اكتب إجابتك)</span>
              </label>
              {sel.other ? (
                <input
                  type="text"
                  aria-label={`إجابتك عن: ${q.question}`}
                  value={sel.otherText}
                  maxLength={300}
                  autoFocus
                  placeholder="اكتب إجابتك هنا — دون أسماء أو أرقام شخصية"
                  onChange={(event) => update(q.id, (s) => setOtherText(s, event.target.value))}
                  className="h-11 w-full rounded-md border border-border-default bg-surface px-3 text-body-sm text-text-primary placeholder:text-text-tertiary hover:border-border-strong focus:border-primary focus:outline-none focus-visible:shadow-[0_0_0_3px_var(--color-focus-ring)]"
                />
              ) : null}

              <label className={OPTION_LABEL_CLASS}>
                <input
                  type={type}
                  name={name}
                  className={RADIO_CLASS}
                  checked={sel.unknown}
                  onChange={() => update(q.id, chooseUnknown)}
                />
                <span>لا أعرف</span>
              </label>
            </div>
            {!answered && sel.other ? (
              <p className="text-caption text-text-tertiary">اكتب كلمتين على الأقل، أو اختر إجابة أخرى.</p>
            ) : null}
          </fieldset>
        );
      })}

      <p className="flex items-start gap-2 text-caption text-text-secondary">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>يكفى وصف الواقعة: لا تكتب أسماء أو أرقام هواتف أو أرقاماً قومية. إجاباتك تُستخدم لهذا السؤال فقط.</span>
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!canSubmit}>
          إرسال الإجابات
        </Button>
        <Button type="button" variant="ghost" disabled={disabled} onClick={onSkip}>
          تخطَّ وأجبنى مباشرة
        </Button>
      </div>
    </form>
  );
}
