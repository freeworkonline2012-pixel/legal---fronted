import {
  type DraftTypeSpec,
  buildAnswers,
  countBlanks,
  withClauseTitle,
  withParagraph,
  groupFields,
  initialAnswers,
  isFieldVisible,
  missingRequired,
  sortFindings,
  visibleFields,
} from './drafting';

const SPEC: DraftTypeSpec = {
  id: 'services',
  label: 'عقد خدمات',
  description: 'د',
  roles: [{ value: 'provider', label: 'مقدم الخدمة' }],
  fields: [
    { id: 'a', label: 'أ', kind: 'text', required: true, group: 'ج1' },
    { id: 'plan', label: 'خطة', kind: 'choice', required: true, default: 'x', options: [{ value: 'x', label: 'X' }, { value: 'y', label: 'Y' }], group: 'ج1' },
    { id: 'pct', label: 'نسبة', kind: 'number', required: true, showWhen: { field: 'plan', equals: 'y' }, group: 'ج2' },
    { id: 'note', label: 'ملاحظة', kind: 'longtext', required: false, group: 'ج2' },
    { id: 'one', label: 'وحيد', kind: 'choice', required: true, options: [{ value: 'only', label: 'فقط' }], group: 'ج2' },
  ],
};

describe('drafting helpers', () => {
  it('initialAnswers: الافتراضى من الكتالوج والاختيار الوحيد المطلوب', () => {
    expect(initialAnswers(SPEC)).toEqual({ plan: 'x', one: 'only' });
  });

  it('showWhen: يظهر الحقل بحسب إجابة غيره', () => {
    const pct = SPEC.fields[2];
    expect(isFieldVisible(pct, { plan: 'x' })).toBe(false);
    expect(isFieldVisible(pct, { plan: 'y' })).toBe(true);
    expect(visibleFields(SPEC, { plan: 'x' }).map((f) => f.id)).toEqual(['a', 'plan', 'note', 'one']);
  });

  it('groupFields يحفظ الترتيب', () => {
    const g = groupFields(visibleFields(SPEC, { plan: 'y' }));
    expect(g.map((x) => x.group)).toEqual(['ج1', 'ج2']);
    expect(g[1].fields.map((f) => f.id)).toEqual(['pct', 'note', 'one']);
  });

  it('buildAnswers: ينزع الفراغ ويحذف الفارغ والمخفى', () => {
    expect(buildAnswers(SPEC, { a: '  س  ', plan: 'x', pct: '30', note: '   ', one: 'only' })).toEqual({ a: 'س', plan: 'x', one: 'only' });
  });

  it('missingRequired: المطلوب المرئى الفارغ فقط', () => {
    expect(missingRequired(SPEC, { plan: 'x', one: 'only' })).toEqual({ a: 'هذا الحقل مطلوب.' });
    expect(Object.keys(missingRequired(SPEC, { a: 'س', plan: 'y', one: 'only' }))).toEqual(['pct']);
  });

  it('sortFindings: الأشد أولاً دون تعديل الأصل', () => {
    const src = [
      { severity: 'منخفض', title: 'ل', detail: '' },
      { severity: 'حرج', title: 'ح', detail: '' },
      { severity: 'متوسط', title: 'م', detail: '' },
    ];
    expect(sortFindings(src).map((f) => f.title)).toEqual(['ح', 'م', 'ل']);
    expect(src[0].title).toBe('ل');
  });
});

describe('تحرير مسودة «عقد آخر»', () => {
  const draft = {
    typeId: 'custom', typeLabel: 'ع', title: 'ع', role: 'first',
    preamble: ['ديباجة [____]'], closing: ['توقيع'], lawyerNotes: [], fullText: '',
    quality: { passed: true, checked: [], findings: [] },
    clauses: [
      { number: 1, heading: 'البند الأول', title: 'أ', paragraphs: ['ف1 [____]', 'ف2'] },
      { number: 2, heading: 'البند الثانى', title: 'ب', paragraphs: ['ف3'] },
    ],
  };
  it('withParagraph/withClauseTitle لا يمسّان الأصل', () => {
    const d2 = withParagraph(draft, 0, 1, 'جديدة');
    expect(d2.clauses[0].paragraphs).toEqual(['ف1 [____]', 'جديدة']);
    expect(draft.clauses[0].paragraphs[1]).toBe('ف2');
    expect(withClauseTitle(draft, 1, 'ج').clauses[1].title).toBe('ج');
    expect(draft.clauses[1].title).toBe('ب');
  });
  it('countBlanks يعد [____] فى الديباجة والبنود', () => {
    expect(countBlanks(draft)).toBe(2);
    expect(countBlanks(withParagraph(draft, 0, 0, 'ملأتها'))).toBe(1);
  });
});
