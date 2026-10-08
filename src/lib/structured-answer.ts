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

  return {
    direct_answer: direct,
    rulings,
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

export interface SourceGroup {
  key: string;
  law: string;
  lawNo: number;
  lawYear: number;
  entries: Array<{ index: number; citation: Citation }>;
}

/** تجميع المصادر بحسب القانون مع الإبقاء على الرقم الأصلي لكل مادة (يربط الحكم بسنده) */
export function groupCitationsByLaw(citations: readonly Citation[]): SourceGroup[] {
  const map = new Map<string, SourceGroup>();
  citations.forEach((citation, index) => {
    const key = `${citation.law_no}-${citation.law_year}-${citation.law}`;
    let g = map.get(key);
    if (!g) {
      g = { key, law: citation.law, lawNo: citation.law_no, lawYear: citation.law_year, entries: [] };
      map.set(key, g);
    }
    g.entries.push({ index, citation });
  });
  return Array.from(map.values());
}
