/**
 * اختبارات ContractsMenu — قائمة «العقود القانونية» المنسدلة (ديسكتوب).
 * تغطى: ثلاث خدمات بالترتيب المطلوب وبمساراتها، فتح/إغلاق (زر، Esc، نقر خارجى، اختيار رابط)، وتمييز الصفحة الحالية.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContractsMenu } from './ContractsMenu';

const mockUsePathname = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

describe('ContractsMenu', () => {
  beforeEach(() => mockUsePathname.mockReturnValue('/chat'));

  it('مغلقة افتراضياً: الزر فقط بلا روابط', () => {
    render(<ContractsMenu />);
    expect(screen.getByRole('button', { name: 'العقود القانونية' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('تعرض الخدمات الثلاث بالترتيب: صياغة، ترجمة، مراجعة', async () => {
    const user = userEvent.setup();
    render(<ContractsMenu />);
    await user.click(screen.getByRole('button', { name: 'العقود القانونية' }));
    const links = screen.getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual(['صياغة العقود', 'ترجمة العقود', 'مراجعة العقود']);
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/contract-drafting', '/translation', '/contracts']);
    expect(screen.queryByText('تدقيق العقود')).not.toBeInTheDocument();
  });

  it('تُغلق بـEsc وبالنقر خارجها وباختيار رابط', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <ContractsMenu />
        <p>خارج القائمة</p>
      </div>,
    );
    const button = screen.getByRole('button', { name: 'العقود القانونية' });

    await user.click(button);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();

    await user.click(button);
    await user.click(screen.getByText('خارج القائمة'));
    expect(screen.queryByRole('link')).not.toBeInTheDocument();

    await user.click(button);
    await user.click(screen.getByRole('link', { name: 'ترجمة العقود' }));
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('تعلّم الصفحة الحالية بـaria-current', async () => {
    const user = userEvent.setup();
    mockUsePathname.mockReturnValue('/contracts');
    render(<ContractsMenu />);
    await user.click(screen.getByRole('button', { name: 'العقود القانونية' }));
    expect(screen.getByRole('link', { name: 'مراجعة العقود' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'صياغة العقود' })).not.toHaveAttribute('aria-current');
  });
});
