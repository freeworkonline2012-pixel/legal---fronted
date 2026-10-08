import {
  articleHref,
  buildDisplaySources,
  cleanLawName,
  groupSources,
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

describe('cleanLawName', () => {
  it('يحذف السنة المكررة داخل الاسم إن طابقت سنة القانون فقط', () => {
    expect(cleanLawName('قانون العمل (2025)', 2025)).toBe('قانون العمل');
    expect(cleanLawName('قانون العمل (2003)', 2025)).toBe('قانون العمل (2003)');
    expect(cleanLawName('قانون العمل', 2025)).toBe('قانون العمل');
  });
});

describe('buildDisplaySources', () => {
  const mk = (article_no: number, snippet = `نص ${article_no}`) => ({ ...DEMO_CITATION, article_no, snippet });

  it('يرقّم المستند إليها بترتيب أول ظهورها فى الأحكام ثم الباقى', () => {
    const cites = [mk(154), mk(6), mk(164), mk(165), mk(88)];
    const d = buildDisplaySources(cites, [{ citation_index: 4 }, { citation_index: 0 }, { citation_index: 2 }, { citation_index: 4 }]);
    expect(d.cited.map((s) => s.citation.article_no)).toEqual([88, 154, 164]);
    expect(d.cited.map((s) => s.displayNo)).toEqual([1, 2, 3]);
    expect(d.extra.map((s) => s.citation.article_no)).toEqual([6, 165]);
    expect(d.extra.map((s) => s.displayNo)).toEqual([4, 5]);
    expect(d.numberByOrigIndex.get(4)).toBe(1);
    expect(d.numberByOrigIndex.get(0)).toBe(2);
  });

  it('يدمج التكرار الحرفى (نفس القانون والمادة والنص) ويحفظ الرقم لكل فهرس مكرر', () => {
    const cites = [mk(88, 'نص واحد'), mk(87), mk(88, 'نص واحد')];
    const d = buildDisplaySources(cites, [{ citation_index: 2 }]);
    expect(d.cited).toHaveLength(1);
    expect(d.numberByOrigIndex.get(0)).toBe(d.numberByOrigIndex.get(2));
    expect(d.extra.map((s) => s.citation.article_no)).toEqual([87]);
  });

  it('لا يدمج مادتين بنفس الرقم إذا اختلف نصاهما', () => {
    const d = buildDisplaySources([mk(88, 'أ'), mk(88, 'ب')], []);
    expect(d.extra).toHaveLength(2);
  });

  it('يتجاهل فهارس السند الفاسدة ولا ينهار', () => {
    const d = buildDisplaySources([mk(1)], [{ citation_index: 9 }, { citation_index: -1 }]);
    expect(d.cited).toHaveLength(0);
    expect(d.extra).toHaveLength(1);
  });
});

describe('groupSources', () => {
  it('يجمّع بحسب القانون ويحفظ الرقم المعروض', () => {
    const a = { ...DEMO_CITATION, article_no: 1 };
    const b = { ...DEMO_CITATION, law: 'قانون آخر', law_no: 5, article_no: 2 };
    const c = { ...DEMO_CITATION, article_no: 3 };
    const d = buildDisplaySources([a, b, c], [{ citation_index: 0 }, { citation_index: 1 }, { citation_index: 2 }]);
    const groups = groupSources(d.cited);
    expect(groups).toHaveLength(2);
    expect(groups[0].entries.map((e) => e.displayNo)).toEqual([1, 3]);
    expect(groups[1].entries.map((e) => e.displayNo)).toEqual([2]);
  });
});
