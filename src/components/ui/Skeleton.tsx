/**
 * مكوّن Skeleton — حالة التحميل (component_states.md القسم 13).
 *
 * - خلفية متدرجة متحركة (تتوقف عند prefers-reduced-motion عبر CSS).
 * - الأبعاد تحاكي المحتوى النهائي حتى لا يحدث «قفز» عند الظهور.
 * - aria-busy على الحاوية + role="status" + نص «جارٍ التحميل…» لقارئ الشاشة.
 */

import type { ReactNode } from 'react';

export interface SkeletonProps {
  /** صفوف نصية: عرض نسبي لكل سطر (مثال: '100%', '70%', '50%') */
  lines?: ReadonlyArray<string>;
  /** عنصر بديل كامل (مثال: بطاقة استشهاد) بدل صفوف */
  children?: ReactNode;
  className?: string;
}

export function Skeleton({ lines = ['100%', '70%', '50%'], children, className = '' }: SkeletonProps) {
  return (
    <div aria-busy="true" role="status" className={className}>
      <span className="sr-only">جارٍ التحميل…</span>
      {children ? (
        <div aria-hidden="true" className="animate-shimmer rounded-md bg-surface-inset">
          {children}
        </div>
      ) : (
        <div aria-hidden="true" className="space-y-2">
          {lines.map((width, index) => (
            <div
              key={`${width}-${index}`}
              className="animate-shimmer h-4 rounded-md bg-surface-inset"
              style={{ width }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Skeleton جاهز لبطاقة الاستشهاد — نفس أبعاد المحتوى النهائي */
export function CitationCardSkeleton() {
  return (
    <Skeleton className="rounded-lg border border-border-default p-6">
      <div className="space-y-3">
        <div className="h-5 w-1/2 rounded-md bg-surface-muted" />
        <div className="h-4 w-1/3 rounded-md bg-surface-muted" />
        <div className="h-4 w-2/3 rounded-md bg-surface-muted" />
        <div className="h-10 w-full rounded-md bg-surface-muted" />
      </div>
    </Skeleton>
  );
}
