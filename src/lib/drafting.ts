/**
 * صياغة العقود — أنواع الواجهة ودوال النموذج المساعدة (نقية وقابلة للاختبار).
 *
 * الكتالوج (الأسئلة والاختيارات والافتراضيات) يأتى كله من الخادم (GET /drafting/types)؛ لا تُكرَّر هنا أى قاعدة
 * قانونية ولا نص بند. الواجهة تعرض النموذج وتنقل الإجابات كما أدخلها المستخدم، والخادم هو الذى يتحقق ويصوغ.
 */

export type DraftFieldKind = 'text' | 'longtext' | 'number' | 'money' | 'date' | 'choice';

export interface DraftOption {
  value: string;
  label: string;
}

export interface DraftField {
  id: string;
  label: string;
  kind: DraftFieldKind;
  required: boolean;
  help?: string;
  options?: DraftOption[];
  min?: number;
  max?: number;
  maxLength?: number;
  default?: string;
  showWhen?: { field: string; equals: string };
  group: string;
}

export interface DraftTypeSpec {
  id: string;
  /** true = «عقد آخر»: بنود الموضوع يصوغها نموذج لغوى على الخادم (مسار منفصل، والنص قابل للتحرير قبل التنزيل) */
  assisted?: boolean;
  label: string;
  description: string;
  roles: DraftOption[];
  fields: DraftField[];
}

export interface DraftClause {
  number: number;
  heading: string;
  title: string;
  paragraphs: string[];
}

export interface DraftQualityFinding {
  severity: string;
  title: string;
  detail: string;
}

export interface DraftResult {
  typeId: string;
  assisted?: boolean;
  blankSlots?: number;
  typeLabel: string;
  title: string;
  role: string;
  preamble: string[];
  clauses: DraftClause[];
  closing: string[];
  lawyerNotes: string[];
  quality: { passed: boolean; checked: string[]; findings: DraftQualityFinding[] };
  fullText: string;
}

export type DraftAnswers = Record<string, string>;

export interface DraftRequest {
  type: string;
  role: string;
  answers: DraftAnswers;
}

/** القيم الافتراضية المقترحة من الكتالوج (نصوص) — الحقول بلا افتراضى تبدأ فارغة. */
export function initialAnswers(spec: DraftTypeSpec): DraftAnswers {
  const out: DraftAnswers = {};
  for (const f of spec.fields) {
    if (f.default !== undefined) out[f.id] = f.default;
    else if (f.kind === 'choice' && f.required && f.options && f.options.length === 1) out[f.id] = f.options[0].value;
  }
  return out;
}

export function isFieldVisible(field: DraftField, answers: DraftAnswers): boolean {
  if (!field.showWhen) return true;
  return (answers[field.showWhen.field] ?? '') === field.showWhen.equals;
}

export function visibleFields(spec: DraftTypeSpec, answers: DraftAnswers): DraftField[] {
  return spec.fields.filter((f) => isFieldVisible(f, answers));
}

/** تجميع الحقول المرئية حسب المجموعة مع حفظ ترتيب ظهورها فى الكتالوج. */
export function groupFields(fields: DraftField[]): Array<{ group: string; fields: DraftField[] }> {
  const groups: Array<{ group: string; fields: DraftField[] }> = [];
  for (const f of fields) {
    const g = groups.find((x) => x.group === f.group);
    if (g) g.fields.push(f);
    else groups.push({ group: f.group, fields: [f] });
  }
  return groups;
}

/**
 * الإجابات المُرسَلة: الحقول المرئية فقط، منزوعة الفراغ، وأى حقل فارغ يُحذف (يقرر الخادم إن كان مطلوباً).
 * حقل أُخفى بعد أن أُجيب عنه (تبدّل خيار) لا يُرسَل فلا يُتحقق منه ولا يدخل النص.
 */
export function buildAnswers(spec: DraftTypeSpec, answers: DraftAnswers): DraftAnswers {
  const out: DraftAnswers = {};
  for (const f of visibleFields(spec, answers)) {
    const raw = answers[f.id];
    if (raw === undefined) continue;
    const v = raw.trim();
    if (v.length > 0) out[f.id] = v;
  }
  return out;
}

/** فحص مبدئى سريع قبل الإرسال: الحقول المطلوبة المرئية الفارغة. الخادم يظل المرجع النهائى لباقى التحققات. */
export function missingRequired(spec: DraftTypeSpec, answers: DraftAnswers): Record<string, string> {
  const errors: Record<string, string> = {};
  const clean = buildAnswers(spec, answers);
  for (const f of visibleFields(spec, answers)) {
    if (f.required && clean[f.id] === undefined) errors[f.id] = 'هذا الحقل مطلوب.';
  }
  return errors;
}

const SEVERITY_ORDER = ['حرج', 'عالٍ', 'متوسط', 'منخفض'];

export function sortFindings(findings: DraftQualityFinding[]): DraftQualityFinding[] {
  return [...findings].sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
}

/** نسخة من المسودة بفقرة بند معدَّلة (لا تمس الأصل). */
export function withParagraph(draft: DraftResult, clauseIndex: number, paragraphIndex: number, text: string): DraftResult {
  return {
    ...draft,
    clauses: draft.clauses.map((c, i) => (i !== clauseIndex ? c : { ...c, paragraphs: c.paragraphs.map((p, j) => (j === paragraphIndex ? text : p)) })),
  };
}

export function withClauseTitle(draft: DraftResult, clauseIndex: number, title: string): DraftResult {
  return { ...draft, clauses: draft.clauses.map((c, i) => (i === clauseIndex ? { ...c, title } : c)) };
}

/** عدد الفراغات [____] فى النص الحالى (يتحدث أثناء ملء المستخدم لها). */
export function countBlanks(draft: DraftResult): number {
  const all = [...draft.preamble, ...draft.clauses.flatMap((c) => c.paragraphs), ...draft.closing].join('\n');
  return (all.match(/\[____\]/g) ?? []).length;
}
