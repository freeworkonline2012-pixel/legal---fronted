import {
  EMPTY_SELECTION,
  buildAnswerPayloads,
  chooseUnknown,
  isAnswered,
  setOtherText,
  toAnswerPayload,
  toggleOption,
  toggleOther,
} from './clarification';
import type { ClarificationQuestion } from './types';

const Q1: ClarificationQuestion = {
  id: 'q1',
  question: 'ما نوع العقد؟',
  options: ['محدد المدة', 'غير محدد المدة'],
  allow_multiple: false,
};
const Q2: ClarificationQuestion = { ...Q1, id: 'q2', question: 'ما سبب الإنهاء؟', options: ['استقالة', 'فصل', 'انتهاء المدة'], allow_multiple: true };

describe('clarification — منطق الاختيار', () => {
  it('الاختيار المفرد يحل محل السابق ويلغى «أخرى» و«لا أعرف»', () => {
    let s = toggleOption(EMPTY_SELECTION, 'محدد المدة', false);
    s = toggleOption(s, 'غير محدد المدة', false);
    expect(s.selected).toEqual(['غير محدد المدة']);
    s = chooseUnknown(s);
    expect(s).toMatchObject({ selected: [], unknown: true });
    s = toggleOption(s, 'محدد المدة', false);
    expect(s.unknown).toBe(false);
  });
  it('المتعدد يُراكم ويُلغى بالنقر ثانية، و«لا أعرف» حصرى', () => {
    let s = toggleOption(EMPTY_SELECTION, 'استقالة', true);
    s = toggleOption(s, 'فصل', true);
    expect(s.selected).toEqual(['استقالة', 'فصل']);
    s = toggleOption(s, 'استقالة', true);
    expect(s.selected).toEqual(['فصل']);
    s = chooseUnknown(s);
    expect(s.selected).toEqual([]);
    expect(s.unknown).toBe(true);
  });
  it('«أخرى» تتطلب نصاً كافياً لتُعدّ إجابة', () => {
    let s = toggleOther(EMPTY_SELECTION, false);
    expect(isAnswered(s)).toBe(false);
    s = setOtherText(s, 'ا');
    expect(isAnswered(s)).toBe(false);
    s = setOtherText(s, 'عقد مياومة');
    expect(isAnswered(s)).toBe(true);
  });
  it('الحمولة: option / custom (منفرد أو مصاحب) / unknown', () => {
    expect(toAnswerPayload(Q1, toggleOption(EMPTY_SELECTION, 'محدد المدة', false))).toEqual({
      question: Q1.question,
      answer: 'محدد المدة',
      kind: 'option',
    });
    expect(toAnswerPayload(Q1, setOtherText(toggleOther(EMPTY_SELECTION, false), '  عقد مياومة '))).toEqual({
      question: Q1.question,
      answer: 'عقد مياومة',
      kind: 'custom',
    });
    let multi = toggleOption(EMPTY_SELECTION, 'استقالة', true);
    multi = toggleOther(multi, true);
    multi = setOtherText(multi, 'اتفاق ودى');
    expect(toAnswerPayload(Q2, multi)).toEqual({ question: Q2.question, answer: 'استقالة، اتفاق ودى', kind: 'custom' });
    expect(toAnswerPayload(Q1, chooseUnknown(EMPTY_SELECTION))).toEqual({ question: Q1.question, answer: '', kind: 'unknown' });
    expect(toAnswerPayload(Q1, EMPTY_SELECTION)).toBeNull();
  });
  it('buildAnswerPayloads: null إن بقى سؤال بلا جواب، وإلا بترتيب الأسئلة', () => {
    const a = toggleOption(EMPTY_SELECTION, 'محدد المدة', false);
    expect(buildAnswerPayloads([Q1, Q2], { q1: a })).toBeNull();
    const r = buildAnswerPayloads([Q1, Q2], { q1: a, q2: chooseUnknown(EMPTY_SELECTION) });
    expect(r?.map((x) => x.kind)).toEqual(['option', 'unknown']);
  });
});
