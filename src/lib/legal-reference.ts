import type { LegalReferenceType } from '@/lib/types';

/** تسميات أنواع المراجع القانونية — تطابق قيد CHECK فى backend migrations/207. */
export const REFERENCE_TYPE_LABELS: Record<LegalReferenceType, string> = {
  book: 'كتاب',
  law_commentary: 'شرح قانون',
  judicial_commentary: 'شرح وتعليق قضائى',
  fiqh: 'فقه',
  article: 'بحث / مقال',
  other: 'أخرى',
};

export const REFERENCE_TYPES = Object.keys(REFERENCE_TYPE_LABELS) as LegalReferenceType[];

export function referenceTypeLabel(type: string): string {
  return (REFERENCE_TYPE_LABELS as Record<string, string>)[type] ?? 'أخرى';
}

export interface SnippetPart {
  text: string;
  match: boolean;
}

/**
 * يقسّم مقتطف البحث (مواضع التطابق محاطة بـ [[ ]]) إلى أجزاء آمنة للعرض —
 * بلا dangerouslySetInnerHTML: النص يُعرض كنص دائماً، والتطابقات فقط تُلَّف بـ <mark>.
 */
export function splitSnippet(snippet: string): SnippetPart[] {
  const parts: SnippetPart[] = [];
  const re = /\[\[(.*?)\]\]/gs;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(snippet)) !== null) {
    if (m.index > last) parts.push({ text: snippet.slice(last, m.index), match: false });
    parts.push({ text: m[1], match: true });
    last = m.index + m[0].length;
  }
  if (last < snippet.length) parts.push({ text: snippet.slice(last), match: false });
  return parts;
}

/** وصف نطاق الصفحات إن وُجد: "ص 11–20" أو "ص 5". */
export function pageRangeLabel(from: number | null, to: number | null): string | null {
  if (from == null && to == null) return null;
  if (from != null && to != null && to !== from) return `ص ${from}–${to}`;
  return `ص ${from ?? to}`;
}
