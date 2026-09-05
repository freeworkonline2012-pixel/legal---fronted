/**
 * مكوّن BottomNav — شريط التنقل السفلي للموبايل (component_states.md القسم 15).
 *
 * - يظهر < 1024px (يُستبدل بالشريط الجانبي على الديسكتوب).
 * - ارتفاع 64px، 4 عناصر، أهداف لمس ≥ 44×44px.
 * - عنصر نشط: لون primary + نص — لا لون وحده (WCAG 1.4.1).
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, FileCheck2, MessageSquareText, ScrollText, Scale } from 'lucide-react';

// «أسئلتي» و«الخطط»/«حسابي» تتطلب تسجيل دخول — مؤجّلة خارج نطاق الإصدار الأول
// (عامة الجمهور، بلا تسجيل دخول). استُبدلت بروابط تصفح القوانين/الأدلة الإرشادية.
// أُضيف "الحوكمة" (2026-09-05) — أول واجهة أمامية لخدمة الحوكمة (Service 3)؛
// راجع تعليق GovernanceScreen بخصوص حالة التحقق من الدقة الحالية.
// أُضيف "العقود" (2026-09-05) — أول واجهة أمامية لخدمة المدقق القانونى للعقود
// (Service 2)؛ الرابط ظاهر دائماً رغم أن الصفحة تتطلب تسجيل دخول (نفس منطق
// Header.tsx — الصفحة نفسها تعرض دعوة لتسجيل الدخول بدل إخفاء الرابط).
const NAV_ITEMS = [
  { href: '/chat', label: 'الأسئلة', icon: MessageSquareText },
  { href: '/laws', label: 'القوانين', icon: Scale },
  { href: '/guidance', label: 'الأدلة', icon: BookOpen },
  { href: '/governance', label: 'الحوكمة', icon: ScrollText },
  { href: '/contracts', label: 'العقود', icon: FileCheck2 },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="التنقل السفلي"
      className="fixed inset-x-0 bottom-0 z-sticky-header border-t border-border-default bg-surface md:hidden"
    >
      <ul className="grid h-16 grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-1 rounded-md text-caption transition-colors duration-[120ms] focus-visible:outline-none ${
                  isActive ? 'text-primary' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
