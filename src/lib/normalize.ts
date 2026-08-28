/**
 * أدوات تطبيع المدخلات العربية.
 *
 * القاعدة من design_tokens.json (typography.note):
 * «الأرقام تُطبع بأرقام عربية غربية (0-9) لاتساق مع البوابات الرسمية،
 *  ويُقبل إدخال أرقام شرقية (٠-٩) من المستخدم ويُطبَّع.»
 */

import type { ConfidenceKey, DomainKey } from './types';

/** تحويل الأرقام الشرقية (٠-٩) إلى غربية (0-9) داخل النص */
export function normalizeArabicDigits(input: string): string {
  return input.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
}

/** المصفوفة الفعلية لقيم DomainKey — نسخة واحدة يُشتق منها isDomainKey وأى تكرار حلقى مستقبلى */
export const DOMAIN_KEYS: readonly DomainKey[] = [
  'labor',
  'rent',
  'personal_status',
  'traffic',
  'consumer_protection',
  'insurance',
  'aml_cft',
  'legal_profession',
  'capital_markets',
  'non_bank_finance',
  'other',
];

/**
 * حارس نوع للقيم القادمة من الخادم (category في القوانين/الأدلة/سجل الأسئلة).
 * تحديث 2026-08-27: DomainKey يطابق backend حرفياً الآن (أُغلقت فجوة المفردات
 * T-VOCAB-1 السابقة) — لا تطبيع إضافى مطلوب، لكن الحارس يبقى ضرورياً لأن DTOs
 * الخلفية تُصرّح category كنص حر (string) وليس union مضبوط، فقد تصل قيمة غير
 * متوقعة مستقبلاً — العرض يجب ألا ينهار عندها أبداً.
 */
export function isDomainKey(value: unknown): value is DomainKey {
  return typeof value === 'string' && (DOMAIN_KEYS as readonly string[]).includes(value);
}

/** إزالة التشكيل (علامات الضبط) من النص — تُستخدم فقط للمقارنة، لا للعرض */
export function stripTashkeel(input: string): string {
  return input.replace(/[\u0617-\u061A\u064B-\u0652]/g, '');
}

/** تصنيف درجة الثقة الرقمية إلى مفتاح (high/medium/low) وفق عتبات design_tokens.json */
export function getConfidenceKey(score: number): ConfidenceKey {
  if (score >= 0.85) return 'high';
  if (score >= 0.6) return 'medium';
  return 'low';
}

/**
 * تقدير المجال القانوني من نص السؤال — حل أمامي خفيف لعرض شريحة «المجال المحدد» (F-01).
 * ⚠️ التصنيف الحاسم يتم في الخلفية (EP-03 — intent classifier)؛ هذه دالة مساعدة
 * للواجهة فقط ولا تُستخدم كحقيقة قانونية.
 */
const DOMAIN_KEYWORDS: ReadonlyArray<{ domain: DomainKey; keywords: ReadonlyArray<string> }> = [
  {
    domain: 'labor',
    keywords: ['شغل', 'عمل', 'موظف', 'عامل', 'راتب', 'مرتب', 'إجازة', 'استقال', 'فصل', 'مستحقات', 'تعويض', 'ساعات عمل', 'أجازة'],
  },
  {
    domain: 'rent',
    keywords: ['إيجار', 'أجرة', 'مؤجر', 'مستأجر', 'شقة', 'عقار', 'إخلاء', 'طرد', 'إيجار قديم', 'عقد إيجار'],
  },
  {
    domain: 'personal_status',
    keywords: ['نفقة', 'طلاق', 'خلع', 'حضانة', 'زواج', 'عقد قران', 'مهر', 'عدة', 'رؤية', 'ولاية'],
  },
  {
    domain: 'traffic',
    keywords: ['مرور', 'مخالفة', 'رخصة', 'قيادة', 'سرعة', 'حجز', 'نقطة', 'حادثة', 'سائق'],
  },
  {
    domain: 'consumer_protection',
    keywords: ['مستهلك', 'سلعة', 'استرجاع', 'استبدال', 'ضمان', 'غش', 'إعلان', 'منتج', 'خدمة'],
  },
  {
    domain: 'insurance',
    keywords: ['تأمين', 'وثيقة تأمين', 'بوليصة', 'مؤمَّن', 'قسط تأمين', 'تعويض تأمينى', 'شركة تأمين'],
  },
  {
    domain: 'aml_cft',
    keywords: ['غسل أموال', 'غسيل أموال', 'تمويل إرهاب', 'العناية الواجبة', 'الإبلاغ عن معاملات مشبوهة'],
  },
];

/** إرجاع المجال الأكثر ترجيحاً من النص، أو null إن لم يُعثر على أي تطابق */
export function detectDomain(question: string): DomainKey | null {
  const normalized = stripTashkeel(question.trim());
  let best: DomainKey | null = null;
  let bestScore = 0;
  for (const group of DOMAIN_KEYWORDS) {
    let score = 0;
    for (const keyword of group.keywords) {
      if (normalized.includes(keyword)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = group.domain;
    }
  }
  return bestScore > 0 ? best : null;
}
