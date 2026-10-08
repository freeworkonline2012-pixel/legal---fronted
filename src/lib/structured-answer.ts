/**
 * أدوات عرض الإجابة المنظَّمة (2026-10-05).
 *
 * كل ما هنا دوال خالصة بلا I/O. الغرض: ألا تنهار الواجهة أبداً عند وصول بنية
 * ناقصة/غير متوقعة من الخادم (parseStructuredAnswer تُعيد null → يُعرض الشكل
 * القديم كما هو)، وألا يُعرض رابط خطر (safeHttpUrl)، وأن تُحسب حالة المصدر
 * بنفس مفردات الخادم عند غيابها (sourceStatusOf).
 */

import type {
  Citation,
  RulingKind,
  SourceStatusLabel,
  StructuredAnswer,
  StructuredRuling,
  StructuredScenario,
} from './types';

const SOURCE_STATUSES: readonly SourceStatusLabel[] = ['ساري', 'معدّل', 'ملغى', 'غير محسوم'];

function isSourceStatus(v: unknown): v is SourceStatusLabel {
  return typeof v === 'string' && (SOURCE_STATUSES as readonly string[]).includes(v);
}

function strList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim());
}

/**
 * يفحص بنية `structured` القادمة من الخادم. يُعيد null (→ الشكل القديم) إن
 * غاب الجواب المباشر أو لم تكن البنية كائناً. الأحكام الفاسدة تُسقَط فردياً
 * ولا تُسقط الإجابة كلها. وسم غير معروف يُعامَل «تفسير» (الأحوط: لا نُظهر
 * حكماً على أنه نص إلا إذا أكّد الخادم ذلك صراحةً).
 */
export function parseStructuredAnswer(raw: unknown): StructuredAnswer | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const direct = typeof r.direct_answer === 'string' ? r.direct_answer.trim() : '';
  if (direct.length === 0) return null;

  const rulings: StructuredRuling[] = [];
  if (Array.isArray(r.rulings)) {
    for (const item of r.rulings) {
      if (!item || typeof item !== 'object') continue;
      const x = item as Record<string, unknown>;
      const claim = typeof x.claim === 'string' ? x.claim.trim() : '';
      if (claim.length === 0) continue;
      const kind: RulingKind = x.kind === 'نص' ? 'نص' : 'تفسير';
      const idx = typeof x.citation_index === 'number' && Number.isInteger(x.citation_index) ? x.citation_index : -1;
      const quote = typeof x.quote === 'string' && x.quote.trim().length > 0 ? x.quote.trim() : null;
      const verified = x.quote_verified === true;
      rulings.push({
        claim,
        // «نص» بلا مقتطف مُتحقَّق منه لا يُقبل في الواجهة أيضاً (دفاع مزدوج)
        kind: kind === 'نص' && verified && quote ? 'نص' : 'تفسير',
        citation_index: idx,
        quote,
        quote_verified: verified,
      });
    }
  }

  const scenarios: StructuredScenario[] = [];
  if (Array.isArray(r.scenarios)) {
    for (const item of r.scenarios) {
      if (!item || typeof item !== 'object') continue;
      const x = item as Record<string, unknown>;
      const condition = typeof x.condition === 'string' ? x.condition.trim() : '';
      const outcome = typeof x.outcome === 'string' ? x.outcome.trim() : '';
      if (condition.length === 0 || outcome.length === 0) continue;
      const idx = typeof x.citation_index === 'number' && Number.isInteger(x.citation_index) ? x.citation_index : -1;
      scenarios.push({ condition, outcome, citation_index: idx });
    }
  }

  return {
    direct_answer: direct,
    rulings,
    scenarios,
    warnings: strList(r.warnings),
    open_issues: strList(r.open_issues),
    facts_to_confirm: strList(r.facts_to_confirm),
    not_covered: strList(r.not_covered),
  };
}

/** حالة المصدر للعرض: من الخادم إن وُجدت، وإلا تُشتق من status بنفس قاعدة الخادم (لا نفترض السريان) */
export function sourceStatusOf(c: Pick<Citation, 'source_status' | 'status' | 'last_amended'>): SourceStatusLabel {
  if (isSourceStatus(c.source_status)) return c.source_status;
  if (c.status === 'active') return 'ساري';
  if (c.status === 'repealed') return 'ملغى';
  if (c.status === 'amended') return c.last_amended ? 'معدّل' : 'غير محسوم';
  return 'غير محسوم';
}

/** يقبل http/https فقط — أي بروتوكول آخر (javascript:, data:) يُرفض */
export function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

/** رابط التحقق من نص المادة داخل المنصة — يحتاج law_id */
export function articleHref(c: Pick<Citation, 'law_id' | 'article_no'>): string | null {
  if (!c.law_id || !/^[A-Za-z0-9_-]+$/.test(c.law_id)) return null;
  return `/laws/${encodeURIComponent(c.law_id)}/articles/${c.article_no}`;
}

/**
 * اسم القانون للعرض: بعض السجلات تحمل السنة داخل الاسم نفسه («قانون العمل (2025)»)
 * فيظهر «قانون العمل (2025) 14/2025» بتكرار السنة؛ نحذف الأقواس إن طابقت law_year.
 */
export function cleanLawName(name: string, lawYear: number): string {
  return name.replace(/\s*[(\uFD3E]\s*(\d{4})\s*[)\uFD3F]\s*$/, (m, y: string) => (Number(y) === lawYear ? '' : m)).trim();
}

export interface DisplaySource {
  /** الرقم المعروض للمستخدم (يبدأ من 1) — بترتيب أول استشهاد فى الأحكام ثم الباقى */
  displayNo: number;
  /** فهرس المادة الأصلى داخل citations */
  origIndex: number;
  citation: Citation;
  /** هل استند إليها حكم واحد على الأقل */
  cited: boolean;
}

export interface DisplaySources {
  cited: DisplaySource[];
  extra: DisplaySource[];
  /** فهرس أصلى (citation_index) → الرقم المعروض؛ غائب إن كان الفهرس خارج النطاق */
  numberByOrigIndex: Map<number, number>;
}

/**
 * يرتّب المصادر للعرض: (1) يدمج التكرار الحرفى (نفس القانون والمادة والنص)،
 * (2) يرقّم المصادر المستند إليها بترتيب أول ظهور لها فى الأحكام فيصير تسلسل
 * الأرقام فى الأحكام 1،2،3… لا [1][5][13][3]، (3) يضع ما استُرجع ولم يستند إليه
 * أى حكم فى قائمة «إضافية» منفصلة بأرقام لاحقة.
 */
export function buildDisplaySources(
  citations: readonly Citation[],
  rulings: ReadonlyArray<Pick<StructuredRuling, 'citation_index'>>,
): DisplaySources {
  const canonical: number[] = [];
  const firstByKey = new Map<string, number>();
  citations.forEach((c, i) => {
    const key = `${c.law_no}|${c.law_year}|${c.article_no}|${c.snippet.replace(/\s+/g, ' ').trim()}`;
    const first = firstByKey.get(key);
    if (first === undefined) {
      firstByKey.set(key, i);
      canonical[i] = i;
    } else {
      canonical[i] = first;
    }
  });

  const numberByCanonical = new Map<number, number>();
  const cited: DisplaySource[] = [];
  for (const r of rulings) {
    const idx = r.citation_index;
    if (!Number.isInteger(idx) || idx < 0 || idx >= citations.length) continue;
    const canon = canonical[idx];
    if (numberByCanonical.has(canon)) continue;
    const no = numberByCanonical.size + 1;
    numberByCanonical.set(canon, no);
    cited.push({ displayNo: no, origIndex: canon, citation: citations[canon], cited: true });
  }
  const extra: DisplaySource[] = [];
  citations.forEach((c, i) => {
    if (canonical[i] !== i || numberByCanonical.has(i)) return;
    const no = numberByCanonical.size + 1;
    numberByCanonical.set(i, no);
    extra.push({ displayNo: no, origIndex: i, citation: c, cited: false });
  });

  const numberByOrigIndex = new Map<number, number>();
  citations.forEach((_, i) => {
    const no = numberByCanonical.get(canonical[i]);
    if (no !== undefined) numberByOrigIndex.set(i, no);
  });
  return { cited, extra, numberByOrigIndex };
}

export interface SourceGroup {
  key: string;
  law: string;
  lawNo: number;
  lawYear: number;
  entries: DisplaySource[];
}

/** تجميع المصادر بحسب القانون مع الإبقاء على الرقم المعروض لكل مادة (يربط الحكم بسنده) */
export function groupSources(sources: readonly DisplaySource[]): SourceGroup[] {
  const map = new Map<string, SourceGroup>();
  for (const src of sources) {
    const c = src.citation;
    const key = `${c.law_no}-${c.law_year}-${c.law}`;
    let g = map.get(key);
    if (!g) {
      g = { key, law: cleanLawName(c.law, c.law_year), lawNo: c.law_no, lawYear: c.law_year, entries: [] };
      map.set(key, g);
    }
    g.entries.push(src);
  }
  return Array.from(map.values());
}
