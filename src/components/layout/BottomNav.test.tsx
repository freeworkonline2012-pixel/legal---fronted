/**
 * اختبارات BottomNav — شريط التنقل السفلي للموبايل.
 *
 * يغطي:
 * - عناصر التنقل الثلاثة (الأسئلة/القوانين/الأدلة — بعد إزالة أسئلتي/الخطط/حسابي
 *   المتطلبة تسجيل دخول من نطاق الإصدار الأول، 2026-08-27).
 * - تمييز العنصر النشط بـ aria-current (لا لون وحده — WCAG 1.4.1).
 */

import { render, screen } from '@testing-library/react';
import { BottomNav } from './BottomNav';

// ملاحظة: المتغير يبدأ بـ mock ليجيز Jest الإشارة إليه داخل factory دالة jest.mock
const mockUsePathname = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

describe('BottomNav', () => {
  it('يعرض عناصر التنقل الثلاثة', () => {
    mockUsePathname.mockReturnValue('/chat');
    render(<BottomNav />);
    expect(screen.getByRole('link', { name: 'الأسئلة' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'القوانين' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'الأدلة' })).toBeInTheDocument();
  });

  it('يعلّم العنصر النشط بـ aria-current="page" فقط', () => {
    mockUsePathname.mockReturnValue('/chat');
    render(<BottomNav />);
    expect(screen.getByRole('link', { name: 'الأسئلة' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'القوانين' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'الأدلة' })).not.toHaveAttribute('aria-current');
  });
});
