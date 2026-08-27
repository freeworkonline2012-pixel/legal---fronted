/**
 * مكوّن SuggestedQuestion — بطاقة سؤال مقترح (component_states.md القسم 6).
 *
 * - أبعاد: عرض 100% (حد أقصى 280px داخل الشبكة)، حشوة 16px، زاوية 12px.
 * - Hover: primary_soft + حدود primary_border + ظل shadow-md.
 * - Disabled: عند تجاوز حد الجلسة التجريبية مع رسالة توضيحية.
 */

import type { CSSProperties } from 'react';
import type { DomainKey } from '@/lib/types';
import { domainChipTokens } from '@/lib/tokens';
import { DOMAIN_ICONS } from '@/components/ui/DomainChip';

export interface SuggestedQuestionProps {
  question: string;
  domain: DomainKey;
  disabled?: boolean;
  disabledReason?: string;
  onClick?: () => void;
}

export function SuggestedQuestion({
  question,
  domain,
  disabled = false,
  disabledReason = 'حد الجلسة التجريبية — سجّل للاستمرار',
  onClick,
}: SuggestedQuestionProps) {
  const token = domainChipTokens[domain];
  const Icon = DOMAIN_ICONS[domain];

  const style = {
    '--chip-fg': token.light_fg,
    '--chip-bg': token.light_bg,
  } as CSSProperties;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      aria-disabled={disabled || undefined}
      className="group flex max-w-[280px] flex-col items-start gap-2 rounded-lg border border-border-default bg-surface-muted p-4 text-start transition-colors duration-[120ms] hover:border-primary-border hover:bg-primary-soft hover:shadow-md focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border-default disabled:hover:bg-surface-muted disabled:hover:shadow-none"
    >
      <span
        className="inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-caption font-medium text-[var(--chip-fg)] dark:border-border-default dark:bg-surface-muted dark:text-text-secondary"
        style={style}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{token.label}</span>
      </span>
      <span className="line-clamp-2 text-body-sm text-text-primary">{question}</span>
      {disabled ? <span className="text-caption text-text-tertiary">{disabledReason}</span> : null}
    </button>
  );
}
