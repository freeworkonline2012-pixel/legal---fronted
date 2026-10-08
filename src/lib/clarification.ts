/**
 * منطق نقى لبطاقة الاستيضاح (المرحلة 2): حالة الاختيار لكل سؤال، واكتمالها، وتحويلها لحمولة الطلب.
 * منفصل عن المكوّن ليُختبر مباشرة.
 */
import type { ClarificationAnswerPayload, ClarificationQuestion } from '@/lib/types';

export const MIN_CUSTOM_ANSWER_CHARS = 2;

export interface QuestionSelection {
  /** الخيارات المختارة من القائمة */
  selected: string[];
  /** اختار «أخرى» */
  other: boolean;
  otherText: string;
  /** اختار «لا أعرف» (حصرى: يلغى ما عداه) */
  unknown: boolean;
}

export const EMPTY_SELECTION: QuestionSelection = { selected: [], other: false, otherText: '', unknown: false };

/** اختيار/إلغاء خيار من القائمة. فى الاختيار المفرد يحل محل كل ما سبق. */
export function toggleOption(sel: QuestionSelection, option: string, multiple: boolean): QuestionSelection {
  if (!multiple) return { selected: [option], other: false, otherText: sel.otherText, unknown: false };
  const has = sel.selected.includes(option);
  return {
    ...sel,
    unknown: false,
    selected: has ? sel.selected.filter((o) => o !== option) : [...sel.selected, option],
  };
}

export function toggleOther(sel: QuestionSelection, multiple: boolean): QuestionSelection {
  if (!multiple) return { selected: [], other: true, otherText: sel.otherText, unknown: false };
  return { ...sel, unknown: false, other: !sel.other };
}

export function setOtherText(sel: QuestionSelection, text: string): QuestionSelection {
  return { ...sel, otherText: text };
}

export function chooseUnknown(sel: QuestionSelection): QuestionSelection {
  return { selected: [], other: false, otherText: sel.otherText, unknown: true };
}

/** هل أُجيب السؤال؟ (خيار أو نص حر كافٍ أو لا أعرف) */
export function isAnswered(sel: QuestionSelection): boolean {
  if (sel.unknown) return true;
  if (sel.selected.length > 0) return true;
  return sel.other && sel.otherText.trim().length >= MIN_CUSTOM_ANSWER_CHARS;
}

/** حمولة إجابة سؤال واحد، أو null إن لم يُجَب بعد. النص الحر المنفرد/المصاحب يجعل kind='custom'. */
export function toAnswerPayload(q: ClarificationQuestion, sel: QuestionSelection): ClarificationAnswerPayload | null {
  if (!isAnswered(sel)) return null;
  if (sel.unknown) return { question: q.question, answer: '', kind: 'unknown' };
  const parts = [...sel.selected];
  const custom = sel.other && sel.otherText.trim().length >= MIN_CUSTOM_ANSWER_CHARS;
  if (custom) parts.push(sel.otherText.trim());
  return { question: q.question, answer: parts.join('، '), kind: custom ? 'custom' : 'option' };
}

/** حمولة كل الأسئلة؛ null إن بقى سؤال بلا جواب. */
export function buildAnswerPayloads(
  questions: readonly ClarificationQuestion[],
  selections: Readonly<Record<string, QuestionSelection>>,
): ClarificationAnswerPayload[] | null {
  const out: ClarificationAnswerPayload[] = [];
  for (const q of questions) {
    const payload = toAnswerPayload(q, selections[q.id] ?? EMPTY_SELECTION);
    if (!payload) return null;
    out.push(payload);
  }
  return out;
}
