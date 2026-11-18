import type { ContractClauseItem, ContractFinding, ContractResponse } from '@/lib/types';

/**
 * منطق إضافة Word (لوحة جانبية داخل Word): دوال نقية بلا Office ولا شبكة فتُختبر مباشرة.
 *
 * مبدأ التصميم: الإضافة لا تعدّل نص العقد أبداً. هى (1) تقرأ نسخة من الملف المفتوح وترفعها لمسار مراجعة العقود نفسه،
 * و(2) تُدرج ملاحظات المراجعة «تعليقات» Word ملتصقة بالنص المعنى. التعليق يُحذف بنقرة ولا يغيّر العقد.
 */

/** الحد الأقصى لحجم الملف: يطابق MAX_UPLOAD_BYTES فى الخلفية */
export const ADDIN_MAX_FILE_BYTES = 10 * 1024 * 1024;
/** سقف التعليقات المُدرجة فى مستند واحد (حتى لا يُغرَق المستند) */
export const MAX_COMMENTS = 60;
/** سقف نص التعليق الواحد */
export const MAX_COMMENT_CHARS = 900;
/** حد البحث فى Word 255 حرفاً؛ نبقى أقل منه */
const MAX_ANCHOR_CHARS = 200;
const MIN_ANCHOR_CHARS = 12;

/** يجمّع شرائح الملف المقروءة من Word (بالترتيب) فى مصفوفة بايتات واحدة */
export function assembleSlices(slices: ReadonlyArray<ArrayLike<number>>): Uint8Array {
  let total = 0;
  for (const s of slices) total += s.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const s of slices) {
    out.set(s as ArrayLike<number>, offset);
    offset += s.length;
  }
  return out;
}

/** اسم ملف docx صالح للرفع من رابط/اسم المستند المفتوح (قد يكون غائباً لمستند لم يُحفظ بعد) */
export function docxFileName(url: string | null | undefined): string {
  const raw = (url ?? '').split(/[?#]/)[0] ?? '';
  const last = raw.split(/[\\/]/).filter(Boolean).pop() ?? '';
  let name = '';
  try {
    name = decodeURIComponent(last);
  } catch {
    name = last;
  }
  name = name.replace(/[\u0000-\u001f<>:"|?*]/g, '').trim();
  if (!name) return 'contract.docx';
  return /\.docx$/i.test(name) ? name : `${name.replace(/\.[A-Za-z0-9]{1,5}$/, '')}.docx`;
}

/** نصوص بحث مرشّحة بالترتيب (الأطول والأدق أولاً): سطر أول مقطوع ثم مقاطع أقصر؛ بلا محارف تحكّم Word الخاصة (^) */
export function anchorCandidates(text: string | null | undefined): string[] {
  const firstLine = (text ?? '').split(/[\r\n\u2028\u2029]/).map((l) => l.trim()).find((l) => l.length > 0) ?? '';
  const clean = firstLine.replace(/\s+/g, ' ').split('^')[0]?.trim() ?? '';
  if (clean.length < MIN_ANCHOR_CHARS) return [];
  const out: string[] = [];
  for (const len of [MAX_ANCHOR_CHARS, 80, 40]) {
    let cut = clean.slice(0, len);
    // لا نقطع كلمة: نتراجع لآخر مسافة إن قطعنا فى منتصفها
    if (clean.length > len) {
      const sp = cut.lastIndexOf(' ');
      if (sp >= MIN_ANCHOR_CHARS) cut = cut.slice(0, sp);
    }
    cut = cut.trim();
    if (cut.length >= MIN_ANCHOR_CHARS && !out.includes(cut)) out.push(cut);
  }
  return out;
}

export interface PlannedComment {
  /** مصدر الملاحظة: finding = ملاحظة على العقد ككل، clause = بند */
  kind: 'finding' | 'clause';
  severity: ContractFinding['severity'] | 'بند';
  /** نصوص بحث لتحديد موضع التعليق بالترتيب؛ فارغة = تعليق عام على بداية المستند */
  anchors: string[];
  text: string;
}

const SEVERITY_RANK: Record<string, number> = { 'حرج': 0, 'عالٍ': 1, 'متوسط': 2, 'منخفض': 3, 'بند': 4 };

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

function findingComment(f: ContractFinding): PlannedComment {
  const parts = [`[منصة قانونية] ${f.kind_label} (${f.severity}): ${f.title}`, f.explanation];
  if (f.suggestion) parts.push(`المقترح: ${f.suggestion}`);
  const anchors = f.evidence.length > 0 ? anchorCandidates(f.evidence[0]?.quote) : [];
  if (anchors.length === 0) parts.unshift('ملاحظة على العقد ككل.');
  return { kind: 'finding', severity: f.severity, anchors, text: clip(parts.join('\n'), MAX_COMMENT_CHARS) };
}

function clauseComment(c: ContractClauseItem): PlannedComment | null {
  if (c.assessment_status !== 'يحتاج مراجعة' || !c.assessment_reasoning) return null;
  const head = `[منصة قانونية] ${c.clause_label}${c.clause_title ? ` — ${c.clause_title}` : ''}: يحتاج مراجعة`;
  const arts = (c.matched_articles ?? []).slice(0, 2).map((a) => `${a.law} م ${a.article_no}`);
  const parts = [head, c.assessment_reasoning];
  if (arts.length > 0) parts.push(`السند: ${arts.join('، ')}`);
  return { kind: 'clause', severity: 'بند', anchors: anchorCandidates(c.clause_text), text: clip(parts.join('\n'), MAX_COMMENT_CHARS) };
}

/**
 * خطة التعليقات: ملاحظات العقد ككل بالأشد أولاً ثم بنود «يحتاج مراجعة» بترتيب ورودها، بسقف MAX_COMMENTS.
 * عقد محجوب التفاصيل (لم يُسدَّد) أو غير منتهٍ ⇒ لا خطة (لا نُدرج تعليقات بلا تفسير).
 */
export function planComments(contract: ContractResponse): PlannedComment[] {
  if (contract.status !== 'processed' || contract.details_locked) return [];
  const findings = [...(contract.contract_findings ?? [])]
    .sort((a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9))
    .map(findingComment);
  const clauses = [...(contract.clauses ?? [])]
    .sort((a, b) => a.clause_index - b.clause_index)
    .map(clauseComment)
    .filter((c): c is PlannedComment => c !== null);
  return [...findings, ...clauses].slice(0, MAX_COMMENTS);
}

export interface ContractSummary {
  totalClauses: number;
  needsReview: number;
  sound: number;
  noSource: number;
  findingsBySeverity: Record<'حرج' | 'عالٍ' | 'متوسط' | 'منخفض', number>;
  locked: boolean;
}

export function summarizeContract(contract: ContractResponse): ContractSummary {
  const clauses = contract.clauses ?? [];
  const bySeverity = { 'حرج': 0, 'عالٍ': 0, 'متوسط': 0, 'منخفض': 0 } as ContractSummary['findingsBySeverity'];
  for (const f of contract.contract_findings ?? []) bySeverity[f.severity] += 1;
  return {
    totalClauses: contract.clause_count ?? clauses.length,
    needsReview: clauses.filter((c) => c.assessment_status === 'يحتاج مراجعة').length,
    sound: clauses.filter((c) => c.assessment_status === 'سليم').length,
    noSource: clauses.filter((c) => c.assessment_status !== null && c.assessment_status !== 'سليم' && c.assessment_status !== 'يحتاج مراجعة').length,
    findingsBySeverity: bySeverity,
    locked: contract.details_locked === true,
  };
}
