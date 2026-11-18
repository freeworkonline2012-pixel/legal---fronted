/**
 * خدمات العقود الثلاث وقائمتها المنسدلة «العقود القانونية» (بطلب صريح 2026-11-18).
 * مصدر واحد للترتيب والأسماء والروابط، تستعمله القائمة العلوية (ContractsMenu) وشريط الموبايل (BottomNav).
 * الترتيب كما طلبه المالك: صياغة العقود، ترجمة العقود، مراجعة العقود.
 * مراجعة العقود هى خدمة «تدقيق العقود» سابقاً (مسارها /contracts كما هو، لم يتغير).
 */

export const CONTRACT_MENU_LABEL = 'العقود القانونية';

export interface ContractService {
  href: string;
  label: string;
}

export const CONTRACT_SERVICES: readonly ContractService[] = [
  { href: '/contract-drafting', label: 'صياغة العقود' },
  { href: '/translation', label: 'ترجمة العقود' },
  { href: '/contracts', label: 'مراجعة العقود' },
] as const;

/** هل المسار الحالى يخص إحدى خدمات العقود (لتمييز القائمة نشطة). */
export function isContractServicePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return CONTRACT_SERVICES.some((s) => pathname === s.href || pathname.startsWith(`${s.href}/`));
}
