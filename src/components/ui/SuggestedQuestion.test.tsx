import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SuggestedQuestion } from './SuggestedQuestion';

describe('SuggestedQuestion', () => {
  it('يعرض نص السؤال وتسمية المجال', () => {
    render(<SuggestedQuestion question="اتنفصلت من الشغل…" domain="labor" />);
    expect(screen.getByRole('button')).toHaveTextContent('اتنفصلت من الشغل…');
    expect(screen.getByText('قانون العمل')).toBeInTheDocument();
  });

  it('يستدعي onClick عند النقر', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(<SuggestedQuestion question="سؤال" domain="rent" onClick={onClick} />);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('يعطّل الزر مع رسالة سبب التعطيل (Disabled ≠ مخفي)', () => {
    render(
      <SuggestedQuestion
        question="سؤال"
        domain="labor"
        disabled
        disabledReason="حد الجلسة التجريبية — سجّل للاستمرار"
      />,
    );
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByText(/حد الجلسة التجريبية/)).toBeInTheDocument();
  });
});
