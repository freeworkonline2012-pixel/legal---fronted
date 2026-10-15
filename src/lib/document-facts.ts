/**
 * منطق نقى لإرفاق مستند: التحقق من الملف قبل الرفع، وتحويل الوقائع المعتمدة إلى إجابات استيضاح
 * (kind='custom') تدخل محرك «الوقائع» المُعاير فى الخادم كما لو أجاب بها السائل بنفسه.
 */
import type { ClarificationAnswerPayload, DocumentFact } from '@/lib/types';

export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_DOCUMENT_EXTENSIONS = ['.pdf', '.docx', '.png', '.jpg', '.jpeg'] as const;
export const DOCUMENT_ACCEPT_ATTR = ACCEPTED_DOCUMENT_EXTENSIONS.join(',');
export const MAX_FACT_VALUE_CHARS = 300;
export const DOCUMENT_LABEL_SUFFIX = ' (من المستند)';

/** يُرجع رسالة خطأ عربية أو undefined إن صلح الملف. التحقق النهائى (بصمة الملف) فى الخادم. */
export function validateDocumentFile(file: { name: string; size: number }): string | undefined {
  const name = file.name.toLowerCase();
  if (!ACCEPTED_DOCUMENT_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return 'نوع الملف غير مدعوم — المسموح: PDF أو Word (DOCX) أو صورة PNG/JPG.';
  }
  if (file.size === 0) return 'الملف فارغ.';
  if (file.size > MAX_DOCUMENT_BYTES) return 'حجم الملف أكبر من المسموح (8 ميغابايت).';
  return undefined;
}

export interface ReviewedFact {
  fact: DocumentFact;
  included: boolean;
  /** قيمة الواقعة بعد تعديل العميل */
  value: string;
}

export function initialReview(facts: readonly DocumentFact[]): ReviewedFact[] {
  return facts.map((fact) => ({ fact, included: true, value: fact.value }));
}

/** الوقائع المعتمدة فقط، بقيمها المعدَّلة، كإجابات استيضاح. القيمة الفارغة تُستبعد. */
export function toClarificationAnswers(reviewed: readonly ReviewedFact[]): ClarificationAnswerPayload[] {
  const out: ClarificationAnswerPayload[] = [];
  for (const r of reviewed) {
    const value = r.value.replace(/\s+/g, ' ').trim().slice(0, MAX_FACT_VALUE_CHARS);
    if (!r.included || value.length === 0) continue;
    out.push({ question: `${r.fact.label}${DOCUMENT_LABEL_SUFFIX}`, answer: value, kind: 'custom' });
  }
  return out;
}

const REDACTION_LABELS: Record<string, string> = {
  national_id: 'أرقام قومية',
  phone: 'هواتف',
  email: 'عناوين بريد',
  iban: 'حسابات بنكية',
  card: 'بطاقات',
  passport: 'جوازات سفر',
  long_number: 'أرقام طويلة (حسابات/سجلات)',
};

/** «2 أرقام قومية، 1 هواتف» أو '' إن لم يُحجب شىء. */
export function redactionSummary(redactions: Record<string, number>): string {
  return Object.entries(redactions)
    .filter(([, n]) => n > 0)
    .map(([kind, n]) => `${n} ${REDACTION_LABELS[kind] ?? kind}`)
    .join('، ');
}
