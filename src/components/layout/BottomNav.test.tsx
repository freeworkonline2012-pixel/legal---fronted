/**
 * اختبارات BottomNav — شريط التنقل السفلي للموبايل.
 *
 * يغطي:
 * - عناصر التنقل (الأسئلة/القوانين/الأدلة/الحوكمة/المذكرات + قائمة «العقود القانونية» 2026-11-18 — بعد إزالة
 *   أسئلتي/الخطط/حسابي المتطلبة تسجيل دخول من نطاق الإصدار الأول، 2026-08-27؛
 *   وإضافة الحوكمة 2026-09-05، ثم العقود 2026-09-05).
 * - تمييز العنصر النشط بـ aria-current (لا لون وحده — WCAG 1.4.1).
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BottomNav } from './BottomNav';

// ملاحظة: المتغير يبدأ بـ mock ليجيز Jest الإشارة إليه داخل factory دالة jest.mock
const mockUsePathname = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

describe('BottomNav', () => {
  it('يعرض عناصر التنقل وزر «العقود القانونية» بدل عنصرَى العقود والترجمة', () => {
    mockUsePathname.mockReturnValue('/chat');
    render(<BottomNav />);
    expect(screen.getByRole('link', { name: 'الأسئلة' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'القوانين' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'الأدلة' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'الحوكمة' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'المذكرات' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'العقود القانونية' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'العقود' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'الترجمة' })).not.toBeInTheDocument();
  });

  it('يعلّم العنصر النشط بـ aria-current="page" فقط', () => {
    mockUsePathname.mockReturnValue('/chat');
    render(<BottomNav />);
    expect(screen.getByRole('link', { name: 'الأسئلة' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'القوانين' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'الأدلة' })).not.toHaveAttribute('aria-current');
  });

  it('يفتح لوحة العقود بالروابط الثلاثة بالترتيب، ويغلقها باختيار رابط', async () => {
    const user = userEvent.setup();
    mockUsePathname.mockReturnValue('/translation');
    render(<BottomNav />);
    await user.click(screen.getByRole('button', { name: 'العقود القانونية' }));
    expect(screen.getByRole('button', { name: 'العقود القانونية' })).toHaveAttribute('aria-expanded', 'true');
    const links = ['صياغة العقود', 'ترجمة العقود', 'مراجعة العقود'].map((name) => screen.getByRole('link', { name }));
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/contract-drafting', '/translation', '/contracts']);
    expect(links[1]).toHaveAttribute('aria-current', 'page');
    await user.click(links[2]);
    expect(screen.queryByRole('link', { name: 'مراجعة العقود' })).not.toBeInTheDocument();
  });

  it('تُغلق اللوحة بمفتاح Esc', async () => {
    const user = userEvent.setup();
    mockUsePathname.mockReturnValue('/chat');
    render(<BottomNav />);
    await user.click(screen.getByRole('button', { name: 'العقود القانونية' }));
    expect(screen.getByRole('link', { name: 'صياغة العقود' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('link', { name: 'صياغة العقود' })).not.toBeInTheDocument();
  });
});
