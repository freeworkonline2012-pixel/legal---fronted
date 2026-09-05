/**
 * مكوّن GovernanceVerdictBadge — شارة حكم خدمة الحوكمة (Service 3).
 *
 * الأحكام الأربعة (يطابق GovernanceVerdict فى types.ts):
 * متوافق (success) / غير متوافق (error) / متوافق جزئياً (warning) /
 * معلومات غير كافية (لون primary محايد — هذا الحكم قرار fail-closed متعمَّد،
 * وليس علامة فشل، فلا يُعرض بلون تحذير/خطأ حتى لا يُفهم خطأً كحكم سلبى).
 *
 * دائماً نص + أيقونة + لون (WCAG 1.4.1 — نفس مبدأ StatusBadge/ConfidenceBadge).
 */

import { CircleCheck, CircleHelp, CircleX, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { GovernanceVerdict } from '@/lib/types';

const VERDICT_ICONS: Record<GovernanceVerdict, LucideIcon> = {
  'متوافق': CircleCheck,
  'غير متوافق': CircleX,
  'متوافق جزئياً': TriangleAlert,
  'معلومات غير كافية': CircleHelp,
};

const VERDICT_COLOR_CLASSES: Record<GovernanceVerdict, string> = {
  'متوافق': 'bg-success-soft text-success border-success',
  'غير متوافق': 'bg-error-soft text-error border-error',
  'متوافق جزئياً': 'bg-warning-soft text-warning border-warning',
  'معلومات غير كافية': 'bg-primary-soft text-primary border-primary-border',
};

const VERDICT_DESCRIPTIONS: Record<GovernanceVerdict, string> = {
  'متوافق': 'الإجراء المذكور متوافق مع النص القانونى المسترجَع.',
  'غير متوافق': 'الإجراء المذكور يخالف النص القانونى المسترجَع صراحة.',
  'متوافق جزئياً': 'جزء من الإجراء متوافق، وجزء آخر يخالف الالتزام المطلوب.',
  'معلومات غير كافية':
    'لا توجد لدينا مادة قانونية كافية للجزم — هذا رفض أمين متعمَّد، وليس خطأً فى النظام؛ راجع محامٍ مختص.',
};

export interface GovernanceVerdictBadgeProps {
  verdict: GovernanceVerdict;
}

export function GovernanceVerdictBadge({ verdict }: GovernanceVerdictBadgeProps) {
  const Icon = VERDICT_ICONS[verdict];

  return (
    <div className="flex flex-col gap-1.5">
      <span
        role="status"
        aria-label={`الحكم: ${verdict}`}
        className={`inline-flex h-8 w-fit items-center gap-1.5 rounded-full border px-3 text-body-sm font-semibold ${VERDICT_COLOR_CLASSES[verdict]}`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span>{verdict}</span>
      </span>
      <p className="text-body-sm text-text-secondary">{VERDICT_DESCRIPTIONS[verdict]}</p>
    </div>
  );
}
