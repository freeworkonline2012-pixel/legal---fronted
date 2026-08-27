/**
 * مكوّن Button — الأزرار (component_states.md القسم 1).
 *
 * الأنواع: primary / secondary / ghost / danger / link
 * الأحجام: lg (48px) / md (44px — افتراضي) / sm (36px)
 * الحالات: Default / Hover / Active / Disabled / Loading
 *
 * قواعد:
 * - أهداف لمس ≥ 44×44px (WCAG 2.5.5) — md+.
 * - Loading يعرض Spinner + «جارٍ…» بنفس أبعاد الزر (لا يزيح التخطيط).
 * - Disabled ≠ مخفي — يبقى مرئياً مع cursor:not-allowed.
 */

import { forwardRef } from 'react';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'lg' | 'md' | 'sm';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-text-on-primary shadow-sm hover:bg-primary-hover hover:shadow-md active:bg-primary-active active:shadow-sm',
  secondary: 'bg-surface text-primary border border-border-strong hover:bg-primary-soft active:bg-surface-muted',
  ghost: 'bg-transparent text-text-secondary hover:bg-surface-muted active:bg-surface-inset',
  danger: 'bg-error text-white hover:opacity-90 active:opacity-80',
  link: 'bg-transparent p-0 h-auto min-h-0 text-link underline decoration-link underline-offset-4 hover:text-primary-hover',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  lg: 'h-12 px-6 text-body',
  md: 'h-11 px-5 text-body-sm',
  sm: 'h-9 px-4 text-body-sm',
};

const BASE_CLASSES =
  'inline-flex select-none items-center justify-center gap-2 rounded-md font-medium ' +
  'transition-[background-color,color,box-shadow] duration-[120ms] focus-visible:outline-none ' +
  'disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled-text disabled:shadow-none';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** عرض حالة التحميل: Spinner + «جارٍ…» وتعطيل النقر */
  loading?: boolean;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    className = '',
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;
  const variantClasses = variant === 'link' ? VARIANT_CLASSES.link : `${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]}`;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`${BASE_CLASSES} ${variantClasses} ${className}`}
      {...rest}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>جارٍ…</span>
        </>
      ) : (
        children
      )}
    </button>
  );
});

export interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** فتح الرابط في تبويب جديد (للمصادر الرسمية) */
  external?: boolean;
  children: ReactNode;
}

/** رابط بشكل زر — يُستخدم للتنقل (next/link) أو الروابط الخارجية */
export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  external = false,
  className = '',
  children,
  ...rest
}: ButtonLinkProps) {
  const variantClasses = variant === 'link' ? VARIANT_CLASSES.link : `${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]}`;
  const classes = `${BASE_CLASSES} ${variantClasses} ${className}`;
  const externalProps = external
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <Link href={href} className={classes} {...externalProps} {...rest}>
      {children}
    </Link>
  );
}
