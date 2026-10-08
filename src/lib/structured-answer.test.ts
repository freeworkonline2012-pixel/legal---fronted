import {
  articleHref,
  groupCitationsByLaw,
  parseStructuredAnswer,
  safeHttpUrl,
  sourceStatusOf,
} from './structured-answer';
import { DEMO_CITATION } from './demo-data';

describe('parseStructuredAnswer', () => {
  it('يرفض ما ليس كائناً أو بلا جواب مباشر (→ الشكل القديم)', () => {
    expect(parseStructuredAnswer(null)).toBeNull();
    expect(parseStructuredAnswer(undefined)).toBeNull();
    expect(parseStructuredAnswer('نص')).toBeNull();
    expect(parseStructuredAnswer({ direct_answer: '   ' })).toBeNull();
    expect(parseStructuredAnswer({ rulings: [] })).toBeNull();
  });

  it('يملأ القوائم الغائبة بمصفوفات فارغة ولا ينهار', () => {
    const v = parseStructuredAnswer({ direct_answer: 'نعم.' });
    expect(v).toEqual({
      direct_answer: 'نعم.',
      rulings: [],
      warnings: [],
      open_issues: [],
      facts_to_confirm: [],
      not_covered: [],
    });
  });

  it('يُسقط الحكم الفاسد وحده ويُبقي الباقي', () => {
    const v = parseStructuredAnswer({
      direct_answer: 'نعم.',
      rulings: [
        null,
        { claim: '' },
        { claim: 'حكم سليم', kind: 'تفسير', citation_index: 0, quote: null, quote_verified: false },
      ],
    });
    expect(v?.rulings).toHaveLength(1);
    expect(v?.rulings[0].claim).toBe('حكم سليم');
  });

  it('لا يقبل وسم «نص» إلا مع مقتطف مُتحقَّق منه (دفاع مزدوج مع الخادم)', () => {
    const base = { claim: 'حكم', citation_index: 0 };
    const v = parseStructuredAnswer({
      direct_answer: 'نعم.',
      rulings: [
        { ...base, kind: 'نص', quote: 'مقتطف', quote_verified: true },
        { ...base, kind: 'نص', quote: 'مقتطف', quote_verified: false },
        { ...base, kind: 'نص', quote: null, quote_verified: true },
        { ...base, kind: 'قيمة غريبة', quote: 'مقتطف', quote_verified: true },
      ],
    });
    expect(v?.rulings.map((r) => r.kind)).toEqual(['نص', 'تفسير', 'تفسير', 'تفسير']);
  });

  it('ينظّف القوائم النصية من العناصر الفارغة وغير النصية', () => {
    const v = parseStructuredAnswer({
      direct_answer: 'نعم.',
      warnings: ['تنبيه', '', 5, '  '],
      open_issues: 'ليست مصفوفة',
    });
    expect(v?.warnings).toEqual(['تنبيه']);
    expect(v?.open_issues).toEqual([]);
  });
});

describe('sourceStatusOf', () => {
  it('يفضّل قيمة الخادم', () => {
    expect(sourceStatusOf({ ...DEMO_CITATION, source_status: 'غير محسوم' })).toBe('غير محسوم');
  });
  it('يشتقها بنفس قاعدة الخادم عند الغياب ولا يفترض السريان', () => {
    expect(sourceStatusOf({ status: 'active', last_amended: null })).toBe('ساري');
    expect(sourceStatusOf({ status: 'repealed', last_amended: null })).toBe('ملغى');
    expect(sourceStatusOf({ status: 'amended', last_amended: '2020-01-01' })).toBe('معدّل');
    expect(sourceStatusOf({ status: 'amended', last_amended: null })).toBe('غير محسوم');
    expect(sourceStatusOf({ status: 'weird' as never, last_amended: null })).toBe('غير محسوم');
  });
});

describe('safeHttpUrl / articleHref', () => {
  it('يقبل http/https فقط', () => {
    expect(safeHttpUrl('https://example.gov.eg/x')).toBe('https://example.gov.eg/x');
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpUrl('data:text/html,x')).toBeNull();
    expect(safeHttpUrl('not a url')).toBeNull();
    expect(safeHttpUrl(null)).toBeNull();
  });
  it('يبني رابط المادة من law_id ويرفض المعرّف الغريب', () => {
    expect(articleHref({ law_id: 'abc-123', article_no: 110 })).toBe('/laws/abc-123/articles/110');
    expect(articleHref({ law_id: null, article_no: 110 })).toBeNull();
    expect(articleHref({ law_id: '../x?y', article_no: 1 })).toBeNull();
  });
});

describe('groupCitationsByLaw', () => {
  it('يجمّع بحسب القانون ويحفظ الفهرس الأصلي', () => {
    const a = { ...DEMO_CITATION, article_no: 1 };
    const b = { ...DEMO_CITATION, law: 'قانون آخر', law_no: 5, article_no: 2 };
    const c = { ...DEMO_CITATION, article_no: 3 };
    const groups = groupCitationsByLaw([a, b, c]);
    expect(groups).toHaveLength(2);
    expect(groups[0].entries.map((e) => e.index)).toEqual([0, 2]);
    expect(groups[1].entries.map((e) => e.index)).toEqual([1]);
  });
});
