/**
 * مكوّن ContractsMenu — قائمة «العقود القانونية» المنسدلة فى القائمة العلوية (ديسكتوب).
 *
 * تضم خدمات العقود الثلاث (صياغة العقود، ترجمة العقود، مراجعة العقود) — راجع lib/contract-services.
 * نمط disclosure (زر + قائمة روابط) لا role="menu": تعمل بلوحة المفاتيح (Tab/Enter)، وتُغلق بـEsc
 * وبالنقر خارجها وباختيار رابط. العنصر النشط يُعلَّم بـaria-current (لا لون وحده — WCAG 1.4.1).
 * على الموبايل تقوم مقامها قائمة BottomNav.
 */

'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { CONTRACT_MENU_LABEL, CONTRACT_SERVICES, isContractServicePath } from '@/lib/contract-services';

export function ContractsMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const active = isContractServicePath(pathname);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative hidden md:block">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex min-h-[44px] items-center gap-1 rounded-md px-3 text-body-sm hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none ${
          active ? 'font-semibold text-primary' : 'text-text-secondary'
        }`}
      >
        {CONTRACT_MENU_LABEL}
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform duration-[120ms] ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <ul
          id={panelId}
          className="absolute end-0 top-full z-dropdown mt-1 min-w-[200px] rounded-md border border-border-default bg-surface p-1 shadow-lg"
        >
          {CONTRACT_SERVICES.map((service) => {
            const isCurrent = pathname === service.href;
            return (
              <li key={service.href}>
                <Link
                  href={service.href}
                  aria-current={isCurrent ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                  className={`flex min-h-[44px] items-center rounded-md px-3 text-body-sm hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none ${
                    isCurrent ? 'font-semibold text-primary' : 'text-text-secondary'
                  }`}
                >
                  {service.label}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
