import {
  type DraftTypeSpec,
  buildAnswers,
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
