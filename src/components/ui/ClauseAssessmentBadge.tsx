/**
 * مكوّن ClauseAssessmentBadge — شارة تقييم بند واحد فى خدمة المدقق القانونى
 * للعقود (Service 2، Phase 2 الأساسية).
 *
 * ثلاث حالات فقط (يطابق ClauseAssessmentStatus فى types.ts) — لا تصنيف مخاطر
 * (حرج/عالٍ/متوسط) هنا، ذلك محجوز لـPhase 3 مؤجَّلة عمداً. "لا يوجد نص قانونى
 * مصرى مفهرَس ذو صلة مباشرة" رفض أمين متعمَّد (نفس مبدأ "معلومات غير كافية" فى
 * GovernanceVerdictBadge) — يُعرض بلون محايد (primary) لا تحذير/خطأ، حتى لا
 * يُفهم كحكم سلبى على البند نفسه.
 *
 * دائماً نص + أيقونة + لون (WCAG 1.4.1).
 */

import { CircleCheck, CircleHelp, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ClauseAssessmentStatus } from '@/lib/types';

const STATUS_ICONS: Record<ClauseAssessmentStatus, LucideIcon> = {
  'سليم': CircleCheck,
  'يحتاج مراجعة': TriangleAlert,
  'لا يوجد نص قانونى مصرى مفهرَس ذو صلة مباشرة': CircleHelp,
};

const STATUS_COLOR_CLASSES: Record<ClauseAssessmentStatus, string> = {
  'سليم': 'bg-success-soft text-success border-success',
  'يحتاج مراجعة': 'bg-warning-soft text-warning border-warning',
  'لا يوجد نص قانونى مصرى مفهرَس ذو صلة مباشرة': 'bg-primary-soft text-primary border-primary-border',
};

/** نص مختصر للشارة نفسها — الحالة الثالثة طويلة جداً لتُعرض كاملة داخل شارة صغيرة */
const STATUS_SHORT_LABEL: Record<ClauseAssessmentStatus, string> = {
  'سليم': 'سليم',
  'يحتاج مراجعة': 'يحتاج مراجعة',
  'لا يوجد نص قانونى مصرى مفهرَس ذو صلة مباشرة': 'لا يوجد نص مفهرَس',
};

export interface ClauseAssessmentBadgeProps {
  status: ClauseAssessmentStatus;
}

export function ClauseAssessmentBadge({ status }: ClauseAssessmentBadgeProps) {
  const Icon = STATUS_ICONS[status];

  return (
    <span
      role="status"
      aria-label={`تقييم البند: ${status}`}
      className={`inline-flex h-8 w-fit shrink-0 items-center gap-1.5 rounded-full border px-3 text-body-sm font-semibold ${STATUS_COLOR_CLASSES[status]}`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span>{STATUS_SHORT_LABEL[status]}</span>
    </span>
  );
}
