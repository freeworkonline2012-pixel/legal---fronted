/**
 * مكوّن ClarificationCard — أسئلة الاستيضاح قبل الإجابة (المرحلة 2).
 *
 * حين يكون السؤال مبهماً أو مركباً أو ناقص الوقائع تسأل المنصة بدل التخمين:
 * - لكل سؤال قائمة منسدلة (Dropdown) بالخيارات + «أخرى» بصياغة السائل + «لا أعرف»؛ والسؤال متعدد الإجابات
 *   قائمة منسدلة بخانات اختيار. الأسئلة تُعرض بعرض الصفحة (عمودان على الشاشات المتوسطة فأكبر) لا صفاً طويلاً.
 * - «إرسال الإجابات» يتفعّل عند الإجابة عن كل الأسئلة؛ «تخطَّ وأجبنى مباشرة» متاح دائماً.
 * - إشعار حماية بيانات: يكفى وصف الواقعة، لا أسماء ولا أرقام شخصية.
 * - بعد الإرسال تتحول البطاقة إلى ملخص للقراءة فقط (resolvedAnswers).
 */

'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle, ShieldCheck } from 'lucide-react';
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

const OTHER_VALUE = '__other__';
const UNKNOWN_VALUE = '__unknown__';
const CHECK_CLASS = 'h-4 w-4 shrink-0 accent-[var(--color-primary)]';
const CONTROL_FOCUS =
  'hover:border-border-strong focus:border-primary focus:outline-none focus-visible:shadow-[0_0_0_3px_var(--color-focus-ring)]';
const SELECT_CLASS =
  'h-11 w-full rounded-md border border-border-default bg-surface px-3 text-body-sm text-text-primary ' + CONTROL_FOCUS;
const TEXT_INPUT_CLASS =
  'h-11 w-full rounded-md border border-border-default bg-surface px-3 text-body-sm text-text-primary placeholder:text-text-tertiary ' +
  CONTROL_FOCUS;
const CHECK_LABEL_CLASS =
  'flex min-h-[44px] cursor-pointer items-start gap-3 rounded-md px-3 py-2.5 text-body-sm text-text-primary ' +
  'hover:bg-surface-muted has-[:checked]:bg-primary-soft';

/** قيمة القائمة المنسدلة (اختيار مفرد) من حالة الاختيار. */
function selectValueOf(sel: QuestionSelection): string {
  if (sel.unknown) return UNKNOWN_VALUE;
  if (sel.other) return OTHER_VALUE;
  return sel.selected[0] ?? '';
}

/** ملخص الاختيار الظاهر فى رأس القائمة متعددة الإجابات. */
function multiSummary(sel: QuestionSelection): string {
  if (sel.unknown) return 'لا أعرف';
  const parts = [...sel.selected];
  if (sel.other) parts.push(sel.otherText.trim() || 'أخرى…');
  return parts.length > 0 ? parts.join('، ') : 'اختر إجابة أو أكثر…';
}

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
          <ul className="grid gap-x-6 gap-y-1 text-body-sm text-text-primary md:grid-cols-2">
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

      <div className="grid gap-4 md:grid-cols-2">
        {request.questions.map((q, index) => {
          const sel = selections[q.id] ?? EMPTY_SELECTION;
          const answered = isAnswered(sel);
          const baseId = `clarification-${request.round}-${q.id}`;
          const labelId = `${baseId}-label`;
          const title = (
            <>
              {index + 1}. {q.question}
              {q.allow_multiple ? (
                <span className="ms-2 text-caption font-normal text-text-secondary">(يمكنك اختيار أكثر من إجابة)</span>
              ) : null}
            </>
          );
          return (
            <fieldset
              key={q.id}
              className="flex min-w-0 flex-col gap-2 rounded-lg border border-border-default bg-surface-muted p-4"
              disabled={disabled}
              data-testid="clarification-question"
            >
              {q.allow_multiple ? (
                <p id={labelId} className="text-body font-medium text-text-primary">
                  {title}
                </p>
              ) : (
                <label htmlFor={baseId} className="text-body font-medium text-text-primary">
                  {title}
                </label>
              )}
              {q.why ? <p className="text-caption text-text-secondary">{q.why}</p> : null}

              {q.allow_multiple ? (
                <details className="rounded-md border border-border-default bg-surface" aria-labelledby={labelId}>
                  <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-3 text-body-sm text-text-primary">
                    <span className="min-w-0 truncate" data-testid="multi-summary">
                      {multiSummary(sel)}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden="true" />
                  </summary>
                  <div className="grid gap-0.5 border-t border-border-default p-1.5">
                    {q.options.map((option) => (
                      <label key={option} className={CHECK_LABEL_CLASS}>
                        <input
                          type="checkbox"
                          className={CHECK_CLASS}
                          checked={sel.selected.includes(option)}
                          onChange={() => update(q.id, (s) => toggleOption(s, option, true))}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                    <label className={CHECK_LABEL_CLASS}>
                      <input
                        type="checkbox"
                        className={CHECK_CLASS}
                        checked={sel.other}
                        onChange={() => update(q.id, (s) => toggleOther(s, true))}
                      />
                      <span>أخرى (اكتب إجابتك)</span>
                    </label>
                    <label className={CHECK_LABEL_CLASS}>
                      <input
                        type="checkbox"
                        className={CHECK_CLASS}
                        checked={sel.unknown}
                        onChange={() => update(q.id, chooseUnknown)}
                      />
                      <span>لا أعرف</span>
                    </label>
                  </div>
                </details>
              ) : (
                <select
                  id={baseId}
                  className={SELECT_CLASS}
                  value={selectValueOf(sel)}
                  onChange={(event) => {
                    const v = event.target.value;
                    if (v === UNKNOWN_VALUE) update(q.id, chooseUnknown);
                    else if (v === OTHER_VALUE) update(q.id, (s) => toggleOther(s, false));
                    else update(q.id, (s) => toggleOption(s, v, false));
                  }}
                >
                  <option value="" disabled>
                    اختر الإجابة…
                  </option>
                  {q.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                  <option value={OTHER_VALUE}>أخرى (اكتب إجابتك)</option>
                  <option value={UNKNOWN_VALUE}>لا أعرف</option>
                </select>
              )}

              {sel.other ? (
                <input
                  type="text"
                  aria-label={`إجابتك عن: ${q.question}`}
                  value={sel.otherText}
                  maxLength={300}
                  autoFocus
                  placeholder="اكتب إجابتك هنا — دون أسماء أو أرقام شخصية"
                  onChange={(event) => update(q.id, (s) => setOtherText(s, event.target.value))}
                  className={TEXT_INPUT_CLASS}
                />
              ) : null}
              {!answered && sel.other ? (
                <p className="text-caption text-text-tertiary">اكتب كلمتين على الأقل، أو اختر إجابة أخرى.</p>
              ) : null}
            </fieldset>
          );
        })}
      </div>

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
