/**
 * T-VOCAB-2 (مرآة أمامية) — مصدر الحقيقة الحقيقي هو backend
 * (src/database/entities/law-kind.ts). نسخة مطابقة هنا فقط لأن الواجهة لا
 * تستورد كود backend مباشرة — راجع نفس التعليق فى normalize.ts عن DOMAIN_KEYS
 * لتفادى فجوة النوع (type safety gap) المُوثَّقة هناك لو أُضيف نوع جديد
 * مستقبلاً ونُسيت هذه النسخة.
 *
 * تُستخدم لتقسيم /api/laws إلى ثلاث صفحات فى الواجهة: /laws (kind=law)،
 * /decisions (DECISION_KINDS)، /regulations (kind=regulation).
 */
export const LAW_KINDS = [
  'law',
  'pm_decision',
  'ministerial_decision',
  'board_decision',
  'circular',
  'regulation',
  'other',
] as const;

export type LawKind = (typeof LAW_KINDS)[number];

/** التجميع المعروض كصفحة "القرارات" — كل ما ليس قانوناً أساسياً أو لائحة تنفيذية أو "أخرى" */
export const DECISION_KINDS: readonly LawKind[] = [
  'pm_decision',
  'ministerial_decision',
  'board_decision',
  'circular',
];
