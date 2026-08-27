/**
 * مكوّن TextArea — حقل نصي متعدد الأسطر (سؤال المستخدم).
 *
 * - ارتفاع أدنى 120px قابل للنمو حتى 240px (component_states.md القسم 2).
 * - حشوة 16px أفقياً / 12px عمودياً، زاوية 8px.
 * - حالة الخطأ: حدود error + رسالة role="alert" + aria-describedby.
 */

import { forwardRef, useId } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import { AlertCircle } from 'lucide-react';

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helper?: string;
  error?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, helper, error, id, className = '', rows = 3, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const helperId = `${fieldId}-helper`;
  const hasError = Boolean(error);

  const borderClasses = hasError
    ? 'border-error focus:border-error'
    : 'border-border-default hover:border-border-strong focus:border-primary';

  return (
    <div className={className}>
      {label ? (
        <label htmlFor={fieldId} className="mb-2 block text-body-sm text-text-secondary">
          {label}
        </label>
      ) : null}
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? helperId : helper ? helperId : undefined}
        className={`min-h-[120px] w-full rounded-md border bg-surface px-4 py-3 text-body text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--color-focus-ring)] ${borderClasses} disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled-text`}
        {...rest}
      />
      {hasError ? (
        <p id={helperId} role="alert" className="mt-1.5 flex items-center gap-1 text-body-sm text-error">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : helper ? (
        <p id={helperId} className="mt-1.5 text-caption text-text-tertiary">
          {helper}
        </p>
      ) : null}
    </div>
  );
});
