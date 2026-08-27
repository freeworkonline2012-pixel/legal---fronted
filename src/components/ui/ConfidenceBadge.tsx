/**
 * مكوّن ConfidenceBadge — شارة درجة الثقة (component_states.md القسم 4).
 *
 * ثقة عالية (≥0.85) / متوسطة (0.60-0.84) / منخفضة (<0.60).
 * دائماً نص + أيقونة + لون (WCAG 1.4.1 — P6).
 * عنصر إعلامي غير تفاعلي — لا Hover/Active.
 */

import { ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ConfidenceKey } from '@/lib/types';
import { confidenceTokens } from '@/lib/tokens';

const CONFIDENCE_ICONS: Record<ConfidenceKey, LucideIcon> = {
  high: ShieldCheck,
  medium: ShieldAlert,
  low: ShieldX,
};

const CONFIDENCE_COLOR_CLASSES: Record<ConfidenceKey, string> = {
  high: 'bg-success-soft text-success border-success',
  medium: 'bg-warning-soft text-warning border-warning',
  low: 'bg-error-soft text-error border-error',
};

export interface ConfidenceBadgeProps {
  level: ConfidenceKey;
}

export function ConfidenceBadge({ level }: ConfidenceBadgeProps) {
  const token = confidenceTokens[level];
  const Icon = CONFIDENCE_ICONS[level];

  return (
    <span
      role="status"
      aria-label={`${token.label} (${token.threshold})`}
      className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-body-sm font-semibold ${CONFIDENCE_COLOR_CLASSES[level]}`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span>{token.label}</span>
    </span>
  );
}
