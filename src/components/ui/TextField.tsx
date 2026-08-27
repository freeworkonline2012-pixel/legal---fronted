/**
 * مكوّن TextField — حقل إدخال نصي (component_states.md القسم 2).
 *
 * - الارتفاع 48px، حشوة 16px أفقياً، زاوية 8px.
 * - التسمية فوق الحقل + رسالة مساعدة تحت الحقل.
 * - حالة الخطأ: حدود error + رسالة role="alert" + aria-describedby.
 * - زر مسح ✕ داخل الحقل عند وجود نص (اختياري عبر clearable).
 */

import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import { AlertCircle, X } from 'lucide-react';

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  error?: string;
  /** إظهار زر ✕ لمسح الحقل عند وجود نص */
  clearable?: boolean;
  onClear?: () => void;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  {
    label,
    helper,
    error,
    clearable = false,
    onClear,
    id,
    className = '',
    value,
    onChange,
    readOnly: readOnlyProp,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const helperId = `${fieldId}-helper`;
  const hasError = Boolean(error);
  const showClear = clearable && typeof value === 'string' && value.length > 0;
  // value بدون onChange = حقل للعرض فقط — readOnly يمنع تحذير React
  // «value prop without onChange» (يُستخدم في معاينة/حقول للقراءة فقط).
  const readOnly = readOnlyProp ?? (value !== undefined && onChange === undefined);

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
      <div className="relative">
        <input
          ref={ref}
          id={fieldId}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? helperId : helper ? helperId : undefined}
          className={`h-12 w-full rounded-md border bg-surface px-4 text-body text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--color-focus-ring)] ${borderClasses} ${showClear ? 'pe-11' : ''} disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled-text`}
          {...rest}
        />
        {showClear ? (
          <button
            type="button"
            aria-label="مسح الحقل"
            onClick={onClear}
            className="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-text-tertiary hover:text-text-primary focus-visible:outline-none"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
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
