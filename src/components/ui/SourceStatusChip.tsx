/**
 * مكوّن SourceStatusChip — حالة المصدر بمفردات العرض: ساري / معدّل / ملغى / غير محسوم.
 *
 * منفصل عن StatusBadge/LawStatusBadge عمداً: هذان يخدمان مفردات الأنواع الخام
 * (active/amended/repealed) أما هذا فيعرض ما يحسمه الخادم من قاعدة البيانات،
 * ويضيف حالة «غير محسوم» (قانون معدَّل بلا تاريخ تعديل معروف، أو حالة مجهولة —
 * لا نفترض السريان أبداً). دائماً نص + أيقونة + لون (WCAG 1.4.1).
 */

import { Ban, CircleCheck, CircleHelp, Pencil } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SourceStatusLabel } from '@/lib/types';

const ICONS: Record<SourceStatusLabel, LucideIcon> = {
  ساري: CircleCheck,
  معدّل: Pencil,
  ملغى: Ban,
  'غير محسوم': CircleHelp,
};

const COLORS: Record<SourceStatusLabel, string> = {
  ساري: 'bg-success-soft text-success border-success',
  معدّل: 'bg-warning-soft text-warning border-warning',
  ملغى: 'bg-error-soft text-error border-error',
  'غير محسوم': 'bg-surface-muted text-text-secondary border-border-strong',
};

export interface SourceStatusChipProps {
  status: SourceStatusLabel;
}

export function SourceStatusChip({ status }: SourceStatusChipProps) {
  const Icon = ICONS[status];
  return (
    <span
      data-testid="source-status"
      className={`inline-flex h-6 items-center gap-1 rounded-full border px-2 text-caption font-semibold ${COLORS[status]}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sr-only">حالة المصدر:</span>
      <span>{status}</span>
    </span>
  );
}
