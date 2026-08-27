/**
 * مكوّن LawStatusBadge — حالة نفاذ القانون نفسه (مستوى القانون لا المادة).
 *
 * منفصل عمداً عن StatusBadge (الذى يخدم LegalStatusKey على مستوى المادة):
 * مفردات backend لحالة القانون هى in_force/amended/repealed، والتسمية العربية
 * الصحيحة نحوياً «سارٍ» (وصف مذكّر لـ«القانون») تختلف عن «سارية» (وصف مؤنث
 * لـ«المادة») — استخدام StatusBadge هنا كان سيُنتج خطأ نحوياً.
 */

import { Ban, CircleCheck, Pencil } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { LawStatusKey } from '@/lib/types';
import { lawStatusTokens } from '@/lib/tokens';

const STATUS_ICONS: Record<LawStatusKey, LucideIcon> = {
  in_force: CircleCheck,
  amended: Pencil,
  repealed: Ban,
};

const STATUS_COLOR_CLASSES: Record<LawStatusKey, string> = {
  in_force: 'bg-success-soft text-success border-success',
  amended: 'bg-warning-soft text-warning border-warning',
  repealed: 'bg-error-soft text-error border-error',
};

export interface LawStatusBadgeProps {
  status: LawStatusKey;
  size?: 'sm' | 'md';
}

export function LawStatusBadge({ status, size = 'sm' }: LawStatusBadgeProps) {
  const token = lawStatusTokens[status];
  const Icon = STATUS_ICONS[status];
  const height = size === 'sm' ? 'h-6' : 'h-7';
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <span
      role="status"
      aria-label={token.label}
      className={`inline-flex items-center gap-1 rounded-full border px-2 text-caption font-semibold ${height} ${STATUS_COLOR_CLASSES[status]}`}
    >
      <Icon className={iconSize} aria-hidden="true" />
      <span>{token.label}</span>
    </span>
  );
}
