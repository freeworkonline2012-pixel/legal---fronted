/**
 * مكوّن StatusBadge — حالة نفاذ المادة القانونية (component_states.md القسم 5).
 *
 * سارية ✓ / معدّلة ✎ / ملغاة ⊘ — دائماً نص + أيقونة + لون (WCAG 1.4.1 — P6).
 * الألوان تُقرأ من متغيرات CSS الدلالية (success/warning/error) فتتغير تلقائياً
 * مع الوضع الليلي دون تكرار hex يدوياً.
 */

import { Ban, CircleCheck, Pencil } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { LegalStatusKey } from '@/lib/types';
import { legalStatusTokens } from '@/lib/tokens';

const STATUS_ICONS: Record<LegalStatusKey, LucideIcon> = {
  active: CircleCheck,
  amended: Pencil,
  repealed: Ban,
};

/** كل حالة تُعيّن لمتغيرات CSS الدلالية (متوافقة مع الوضع الليلي) */
const STATUS_COLOR_CLASSES: Record<LegalStatusKey, string> = {
  active: 'bg-success-soft text-success border-success',
  amended: 'bg-warning-soft text-warning border-warning',
  repealed: 'bg-error-soft text-error border-error',
};

export interface StatusBadgeProps {
  status: LegalStatusKey;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const token = legalStatusTokens[status];
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
