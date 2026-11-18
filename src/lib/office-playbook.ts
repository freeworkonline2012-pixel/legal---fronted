/**
 * Playbook المكتب (واجهة): أنواع وأدوات صافية لشاشة «قواعد المكتب». لا منطق قانونى هنا: التحقق النهائى فى الخادم،
 * وهذا الملف يبنى الحمولة ويتحقق تحققاً أولياً كى لا يرى المستخدم رفضاً من الخادم لخطأ واضح.
 */

export type PlaybookSeverity = 'حرج' | 'عالٍ' | 'متوسط' | 'منخفض';
export type CustomRuleKind = 'forbidden_phrase' | 'required_phrase';

export interface PlaybookCatalogRule {
  id: string;
  title: string;
  severity: PlaybookSeverity;
  families: string[] | null;
  excludeFamilies: string[];
  protects: 'requester' | null;
  absence: boolean;
}

export interface PlaybookCustomRule {
  id: string;
  kind: CustomRuleKind;
  title: string;
  phrases: string[];
  families: string[] | null;
  severity: PlaybookSeverity;
  explanation: string;
  suggestion: string;
  enabled: boolean;
}

export interface PlaybookConfig {
  disabledRules: string[];
  severityOverrides: Record<string, PlaybookSeverity>;
  customRules: PlaybookCustomRule[];
}

export interface PlaybookLimits {
  maxCustomRules: number;
  maxPhrasesPerRule: number;
  maxPhraseLength: number;
  minPhraseLength: number;
  maxTitleLength: number;
  maxTextLength: number;
  maxDisabled: number;
}

export interface OfficePlaybookView {
  config: PlaybookConfig;
  version: number;
  updatedAt: string | null;
  customized: boolean;
  catalog: PlaybookCatalogRule[];
  limits: PlaybookLimits;
}

export const SEVERITIES: PlaybookSeverity[] = ['حرج', 'عالٍ', 'متوسط', 'منخفض'];
export const CUSTOM_SEVERITIES: PlaybookSeverity[] = ['عالٍ', 'متوسط', 'منخفض'];

export const KIND_LABELS: Record<CustomRuleKind, string> = {
  forbidden_phrase: 'عبارة لا أريدها فى العقد',
  required_phrase: 'عبارة أريدها فى كل عقد',
};

export const FAMILY_LABELS: Array<{ id: string; label: string }> = [
  { id: 'lease', label: 'عقد إيجار' },
  { id: 'sale', label: 'عقد بيع' },
  { id: 'services', label: 'عقد خدمات أو مقاولة أو توريد' },
  { id: 'employment', label: 'عقد عمل' },
  { id: 'partnership', label: 'عقد شراكة أو استثمار' },
  { id: 'finance', label: 'عقد تمويل أو قرض' },
  { id: 'agency', label: 'عقد وكالة أو سمسرة أو تسويق' },
  { id: 'licence', label: 'عقد ترخيص أو امتياز تجارى' },
  { id: 'security', label: 'عقد رهن أو كفالة' },
  { id: 'gift', label: 'عقد هبة' },
  { id: 'deposit', label: 'عقد وديعة أو عارية' },
  { id: 'settlement', label: 'عقد صلح أو مخالصة' },
  { id: 'insurance', label: 'عقد تأمين' },
  { id: 'nda', label: 'اتفاقية عدم إفصاح وسرية' },
];

export function familiesLabel(families: string[] | null): string {
  if (!families || families.length === 0) return 'كل أنواع العقود';
  const byId = new Map(FAMILY_LABELS.map((f) => [f.id, f.label] as const));
  return families.map((f) => byId.get(f) ?? f).join('، ');
}

let seq = 0;
/** معرّف مؤقت للقاعدة الجديدة فى الواجهة فقط (الخادم يولّد المعرّف الحقيقى عند الحفظ). */
export function blankCustomRule(): PlaybookCustomRule {
  seq += 1;
  return {
    id: `new_${Date.now().toString(36)}_${seq}`,
    kind: 'forbidden_phrase',
    title: '',
    phrases: [],
    families: null,
    severity: 'متوسط',
    explanation: '',
    suggestion: '',
    enabled: true,
  };
}

export const isNewRuleId = (id: string): boolean => id.startsWith('new_');

/** نص العبارات (واحدة فى كل سطر) ⇄ مصفوفة. */
export const phrasesToText = (phrases: string[]): string => phrases.join('\n');
export function textToPhrases(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 0);
}

/** الحمولة: قاعدة جديدة بلا حقل id أصلاً (الخادم يولّد معرفها)، والمحفوظة تحمل معرفها. */
export type PlaybookPayloadRule = Omit<PlaybookCustomRule, 'id'> & { id?: string };
export interface PlaybookPayload extends Omit<PlaybookConfig, 'customRules'> {
  customRules: PlaybookPayloadRule[];
}

export function toPayload(config: PlaybookConfig): PlaybookPayload {
  return {
    ...config,
    customRules: config.customRules.map((r) => {
      if (!isNewRuleId(r.id)) return r;
      const rest: Omit<PlaybookCustomRule, 'id'> = { ...r };
      delete (rest as { id?: string }).id;
      return rest;
    }),
  };
}

/** تحقق أولى قبل الإرسال (الخادم هو الحكم): يرجع قائمة رسائل، فارغة = صالح. */
export function validateConfig(config: PlaybookConfig, limits: PlaybookLimits): string[] {
  const errors: string[] = [];
  if (config.customRules.length > limits.maxCustomRules) errors.push(`الحد الأقصى للقواعد الخاصة ${limits.maxCustomRules}`);
  config.customRules.forEach((r, i) => {
    const label = `القاعدة الخاصة رقم ${i + 1}`;
    if (!r.title.trim()) errors.push(`${label}: العنوان مطلوب`);
    if (r.phrases.length === 0) errors.push(`${label}: أضف عبارة واحدة على الأقل`);
    if (r.phrases.length > limits.maxPhrasesPerRule) errors.push(`${label}: الحد الأقصى ${limits.maxPhrasesPerRule} عبارات`);
    for (const p of r.phrases) {
      if (p.length > limits.maxPhraseLength) errors.push(`${label}: عبارة أطول من ${limits.maxPhraseLength} حرفاً`);
      else if (p.replace(/\s/g, '').length < limits.minPhraseLength) errors.push(`${label}: عبارة قصيرة جداً («${p}»)`);
    }
  });
  return errors;
}

/** يعدّل قاعدة افتراضية: التفعيل. */
export function setBuiltInEnabled(config: PlaybookConfig, id: string, enabled: boolean): PlaybookConfig {
  const disabled = new Set(config.disabledRules);
  if (enabled) disabled.delete(id);
  else disabled.add(id);
  return { ...config, disabledRules: [...disabled] };
}

/** يعدّل درجة قاعدة افتراضية؛ إرجاعها لدرجتها الأصلية يحذف التجاوز. */
export function setBuiltInSeverity(config: PlaybookConfig, rule: PlaybookCatalogRule, severity: PlaybookSeverity): PlaybookConfig {
  const next = { ...config.severityOverrides };
  if (severity === rule.severity) delete next[rule.id];
  else next[rule.id] = severity;
  return { ...config, severityOverrides: next };
}
