/**
 * مكوّن Modal — مودال تأكيد (component_states.md القسم 12).
 *
 * - خلفية overlay + z-index 300.
 * - العرض الأقصى 480px (92vw موبايل)، زاوية 16px، ظل shadow-xl.
 * - Focus trap: التركيز يُحبس داخل المودال، Esc يغلقه، ويعود التركيز للمُطلق عند الإغلاق.
 * - أمثلة: تأكيد حذف سؤال / تأكيد إلغاء الاشتراك.
 */

'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

export interface ModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  primaryLabel: string;
  secondaryLabel?: string;
  /** الزر الأساسي بصبغة danger (حذف نهائي) */
  danger?: boolean;
  primaryLoading?: boolean;
  onPrimary: () => void;
  onClose: () => void;
}

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  title,
  children,
  primaryLabel,
  secondaryLabel = 'إلغاء',
  danger = false,
  primaryLoading = false,
  onPrimary,
  onClose,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const panel = panelRef.current;
    if (panel) {
      const firstFocusable = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      firstFocusable?.focus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;

      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute('disabled'),
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    return () => {
      previouslyFocusedRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-modal flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="إغلاق المودال"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-overlay focus-visible:outline-none"
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        className="relative w-full max-w-[480px] rounded-xl bg-surface p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-h3 font-bold text-text-primary">{title}</h3>
          <button
            type="button"
            aria-label="إغلاق"
            onClick={onClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-surface-muted focus-visible:outline-none"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4 text-body text-text-secondary">{children}</div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={primaryLoading}>
            {secondaryLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onPrimary} loading={primaryLoading}>
            {primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
