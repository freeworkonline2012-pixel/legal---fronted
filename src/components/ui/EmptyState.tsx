/**
 * مكوّن EmptyState — الحالة الفارغة (component_states.md القسم 14).
 *
 * كل شاشة يجب أن تملك حالة فارغة مع إجراء واحد واضح (لا طريق مسدود).
 * أيقونة 48px text-tertiary + H3 + نص 14px + زر CTA واحد.
 */

import type { ReactNode } from 'react';
import Link from 'next/link';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** بديل عن onAction — رابط تنقّل داخلي (يُعرض عبر next/link — لا إعادة تحميل كاملة) */
  actionHref?: string;
}

export function EmptyState({ icon, title, description, actionLabel, onAction, actionHref }: EmptyStateProps) {
  return (
    <div
      aria-label={title}
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border-strong bg-surface px-6 py-10 text-center"
    >
      {icon ? <div className="text-text-tertiary">{icon}</div> : null}
      <h3 className="text-h3 font-bold text-text-primary">{title}</h3>
      {description ? <p className="max-w-md text-body-sm text-text-secondary">{description}</p> : null}
      {actionLabel && (onAction || actionHref) ? (
        actionHref ? (
          <Link
            href={actionHref}
            className="mt-2 inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-5 text-body-sm font-semibold text-text-on-primary hover:bg-primary-hover focus-visible:outline-none"
          >
            {actionLabel}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onAction}
            className="mt-2 inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-5 text-body-sm font-semibold text-text-on-primary hover:bg-primary-hover focus-visible:outline-none"
          >
            {actionLabel}
          </button>
        )
      ) : null}
    </div>
  );
}
