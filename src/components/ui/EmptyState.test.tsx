import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('يعرض العنوان والوصف', () => {
    render(<EmptyState title="لا توجد أسئلة بعد" description="اطرح أول سؤال." />);
    expect(screen.getByRole('heading', { name: 'لا توجد أسئلة بعد' })).toBeInTheDocument();
    expect(screen.getByText('اطرح أول سؤال.')).toBeInTheDocument();
  });

  it('يعرض زر CTA ويستدعي onAction', async () => {
    const user = userEvent.setup();
    const onAction = jest.fn();
    render(<EmptyState title="فارغ" actionLabel="ابدأ الآن" onAction={onAction} />);
    await user.click(screen.getByRole('button', { name: 'ابدأ الآن' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('يعرض رابط CTA عند تمرير actionHref', () => {
    render(<EmptyState title="فارغ" actionLabel="اذهب" actionHref="/chat" />);
    expect(screen.getByRole('link', { name: 'اذهب' })).toHaveAttribute('href', '/chat');
  });
});
