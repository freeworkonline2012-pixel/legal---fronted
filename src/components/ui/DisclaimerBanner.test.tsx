import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DisclaimerBanner } from './DisclaimerBanner';

describe('DisclaimerBanner', () => {
  it('يعرض نص إخلاء المسؤولية افتراضياً', () => {
    render(<DisclaimerBanner />);
    expect(screen.getByLabelText('إخلاء مسؤولية')).toBeInTheDocument();
    expect(screen.getByText(/معلومة قانونية موثّقة بالمصدر/)).toBeInTheDocument();
  });

  it('يطوي النص عند الضغط على «أخفِ»', async () => {
    const user = userEvent.setup();
    render(<DisclaimerBanner />);
    const toggle = screen.getByRole('button', { name: /أخفِ/ });
    await user.click(toggle);
    expect(screen.queryByText(/معلومة قانونية موثّقة بالمصدر/)).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('يعيد إظهار النص عند الضغط على «أظهر»', async () => {
    const user = userEvent.setup();
    render(<DisclaimerBanner />);
    await user.click(screen.getByRole('button', { name: /أخفِ/ }));
    await user.click(screen.getByRole('button', { name: /أظهر/ }));
    expect(screen.getByText(/معلومة قانونية موثّقة بالمصدر/)).toBeInTheDocument();
  });
});
