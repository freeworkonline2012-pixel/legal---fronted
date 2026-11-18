/**
 * مكوّن BottomNav — شريط التنقل السفلي للموبايل (component_states.md القسم 15).
 *
 * - يظهر < 1024px (يُستبدل بالشريط الجانبي على الديسكتوب).
 * - ارتفاع 64px، 6 عناصر، أهداف لمس ≥ 44×44px.
 * - عنصر نشط: لون primary + نص — لا لون وحده (WCAG 1.4.1).
 * - «العقود القانونية» (2026-11-18، بطلب صريح): عنصر واحد يفتح لوحة بخدمات العقود الثلاث
 *   (صياغة/ترجمة/مراجعة العقود) بدل عنصرَى «العقود» و«الترجمة» المنفصلين. يُعلَّم نشطاً
 *   عند وجود المستخدم فى أى من الصفحات الثلاث. تُغلق اللوحة بـEsc أو بالنقر خارجها أو باختيار رابط.
 */

'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, FileCheck2, FileText, MessageSquareText, ScrollText, Scale } from 'lucide-react';
import { CONTRACT_MENU_LABEL, CONTRACT_SERVICES, isContractServicePath } from '@/lib/contract-services';

// «أسئلتي» و«الخطط»/«حسابي» تتطلب تسجيل دخول — مؤجّلة خارج نطاق الإصدار الأول
// (عامة الجمهور، بلا تسجيل دخول). استُبدلت بروابط تصفح القوانين/الأدلة الإرشادية.
// أُضيف "الحوكمة" (2026-09-05) — أول واجهة أمامية لخدمة الحوكمة (Service 3)؛
// راجع تعليق GovernanceScreen بخصوص حالة التحقق من الدقة الحالية.
// الروابط قبل وبعد عنصر العقود (ترتيبها كما كان).
const ITEMS_BEFORE = [
  { href: '/chat', label: 'الأسئلة', icon: MessageSquareText },
  { href: '/laws', label: 'القوانين', icon: Scale },
  { href: '/guidance', label: 'الأدلة', icon: BookOpen },
  { href: '/governance', label: 'الحوكمة', icon: ScrollText },
] as const;
const ITEMS_AFTER = [{ href: '/memos', label: 'المذكرات', icon: FileText }] as const;

const LINK_BASE =
  'flex h-16 w-full flex-col items-center justify-center gap-1 rounded-md text-caption transition-colors duration-[120ms] focus-visible:outline-none';

export function BottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLLIElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const contractsActive = isContractServicePath(pathname);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: Event) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function renderLink(item: { href: string; label: string; icon: typeof Scale }) {
    const isActive = pathname === item.href;
    const Icon = item.icon;
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          aria-current={isActive ? 'page' : undefined}
          className={`${LINK_BASE} ${isActive ? 'text-primary' : 'text-text-secondary hover:text-text-primary'}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
          <span>{item.label}</span>
        </Link>
      </li>
    );
  }

  return (
    <nav
      aria-label="التنقل السفلي"
      className="fixed inset-x-0 bottom-0 z-sticky-header border-t border-border-default bg-surface md:hidden"
    >
      <ul className="grid h-16 grid-cols-6">
        {ITEMS_BEFORE.map(renderLink)}
        <li ref={rootRef} className="relative">
          <button
            ref={buttonRef}
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((v) => !v)}
            className={`${LINK_BASE} ${contractsActive ? 'text-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            <FileCheck2 className="h-5 w-5" aria-hidden="true" />
            <span className="text-center text-[11px] leading-tight">{CONTRACT_MENU_LABEL}</span>
          </button>
          {open ? (
            <ul
              id={panelId}
              className="absolute bottom-full end-0 z-dropdown mb-2 min-w-[180px] rounded-md border border-border-default bg-surface p-1 shadow-lg"
            >
              {CONTRACT_SERVICES.map((service) => {
                const isCurrent = pathname === service.href;
                return (
                  <li key={service.href}>
                    <Link
                      href={service.href}
                      aria-current={isCurrent ? 'page' : undefined}
                      onClick={() => setOpen(false)}
                      className={`flex min-h-[44px] items-center rounded-md px-3 text-body-sm hover:bg-surface-muted focus-visible:outline-none ${
                        isCurrent ? 'font-semibold text-primary' : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {service.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </li>
        {ITEMS_AFTER.map(renderLink)}
      </ul>
    </nav>
  );
}
