/** تسميات معايير مراجعة العقود العشرة — مفاتيحها تطابق backend (criteria.util.ts) */
const CRITERIA_LABELS: Record<string, string> = {
  liability: 'المسؤولية',
  compensation: 'التعويض',
  duration: 'المدة',
  payment: 'شروط الدفع',
  force_majeure: 'القوة القاهرة',
  data_protection: 'حماية البيانات',
  exit: 'الإنهاء والخروج',
  reciprocity: 'المعاملة بالمثل',
  legal_compliance: 'الامتثال القانونى',
  financial_impact: 'الأثر المالى',
};

/** يحوّل clause_type_guess (مفاتيح مفصولة بفاصلة) إلى تسميات عربية؛ المفاتيح غير المعروفة تُتجاهل */
export function criteriaLabels(typeGuess: string | null | undefined): string[] {
  if (!typeGuess) return [];
  return typeGuess
    .split(',')
    .map((k) => CRITERIA_LABELS[k.trim()])
    .filter((l): l is string => Boolean(l));
}
