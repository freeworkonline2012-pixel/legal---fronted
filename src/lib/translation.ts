/**
 * منطق نقى لخدمة الترجمة القانونية: التحقق من الملف، تسميات اللغات والوسوم، ونسبة التقدم.
 * لا قرار قانونى هنا — الخادم هو من يكشف اللغة ويفحص الجودة ويحسم الوسوم.
 */
import type { TranslationFlag, TranslationJob, TranslationLang } from '@/lib/types';

export const MAX_TRANSLATION_BYTES = 10 * 1024 * 1024;
export const TRANSLATION_EXTENSIONS = ['.pdf', '.docx', '.png', '.jpg', '.jpeg'] as const;
export const TRANSLATION_ACCEPT_ATTR = TRANSLATION_EXTENSIONS.join(',');
export const MAX_EDIT_CHARS = 6000;
export const ACTIVE_TRANSLATION_KEY = 'shield.translation.active';

export const LANG_LABELS: Record<TranslationLang, string> = { ar: 'العربية', en: 'الإنجليزية' };

/** يُرجع رسالة خطأ عربية أو undefined إن صلح الملف. التحقق النهائى (بصمة الملف واللغة) فى الخادم. */
export function validateTranslationFile(file: { name: string; size: number }): string | undefined {
  const name = file.name.toLowerCase();
  if (!TRANSLATION_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return 'نوع الملف غير مدعوم — المسموح: PDF أو Word (DOCX) أو صورة PNG/JPG.';
  }
  if (file.size === 0) return 'الملف فارغ.';
  if (file.size > MAX_TRANSLATION_BYTES) return 'حجم الملف أكبر من المسموح (10 ميغابايت).';
  return undefined;
}

export const FLAG_LABELS: Record<TranslationFlag, string> = {
  numbers_mismatch: 'الأرقام أو المبالغ أو التواريخ لا تطابق الأصل — راجعها',
  length_anomaly: 'طول الترجمة غير متناسب مع الأصل — قد يكون هناك حذف أو إضافة',
  untranslated_text: 'بقى جزء من النص دون ترجمة',
  empty_translation: 'لم تُنتَج ترجمة لهذه الفقرة',
};

export function flagLabels(flags: readonly TranslationFlag[]): string[] {
  return flags.map((f) => FLAG_LABELS[f] ?? f);
}

/** نسبة التقدم 0..100 بحسب الفقرات المنجزة. */
export function progressPercent(job: Pick<TranslationJob, 'progress' | 'status'>): number {
  if (job.status === 'completed') return 100;
  const { done_units, total_units } = job.progress;
  if (total_units <= 0) return 0;
  return Math.min(99, Math.max(0, Math.round((done_units / total_units) * 100)));
}

/** اتجاه النص حسب لغته (للمعاينة). */
export function dirFor(lang: TranslationLang): 'rtl' | 'ltr' {
  return lang === 'ar' ? 'rtl' : 'ltr';
}

/** الاتجاه المعروض للمستخدم: «من العربية إلى الإنجليزية». */
export function directionLabel(from: TranslationLang, to: TranslationLang): string {
  return `من ${LANG_LABELS[from]} إلى ${LANG_LABELS[to]}`;
}

/** نص الموافقة الظاهر للمستخدم (يطابق ما يفعله الخادم فعلاً). */
export const CONSENT_TEXT =
  'أوافق على إرسال نص هذا العقد كاملاً — بما فيه الأسماء والعناوين والأرقام — إلى مزوّد ذكاء اصطناعى خارجى لترجمته، ' +
  'وعلى حفظه مشفَّراً فى المنصة مؤقتاً (يُحذف تلقائياً بعد 48 ساعة أو 24 ساعة من اكتمال الترجمة، ويمكنك حذفه فوراً).';
