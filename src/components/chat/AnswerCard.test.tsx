import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnswerCard } from './AnswerCard';
import { DEMO_ANSWER } from '@/lib/demo-data';

describe('AnswerCard', () => {
  it('يعرض شارة الثقة والإجابة المبسطة', () => {
    render(<AnswerCard answer={DEMO_ANSWER} />);
    expect(screen.getByText('ثقة عالية')).toBeInTheDocument();
    expect(screen.getByText(DEMO_ANSWER.answer)).toBeInTheDocument();
  });

  it('يعرض بطاقة الاستشهاد', () => {
    render(<AnswerCard answer={DEMO_ANSWER} />);
    expect(screen.getByLabelText('بطاقة استشهاد')).toBeInTheDocument();
    expect(screen.getAllByText(/المادة 110/).length).toBeGreaterThan(0);
  });

  it('يفتح قسم «بمعنى آخر» عند النقر', async () => {
    const user = userEvent.setup();
    render(<AnswerCard answer={DEMO_ANSWER} />);
    const toggle = screen.getByRole('button', { name: /بمعنى آخر/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/بمعنى أبسط/)).toBeInTheDocument();
  });

  it('يعرض أسئلة المتابعة ويستدعي onFollowUpClick', async () => {
    const user = userEvent.setup();
    const onFollowUpClick = jest.fn();
    render(
      <AnswerCard
        answer={DEMO_ANSWER}
        followUpQuestions={['وماذا لو كان العقد شفهياً؟']}
        onFollowUpClick={onFollowUpClick}
      />,
    );
    await user.click(screen.getByRole('button', { name: /وماذا لو كان العقد شفهياً/ }));
    expect(onFollowUpClick).toHaveBeenCalledWith('وماذا لو كان العقد شفهياً؟');
  });

  it('يعرض التقييم 👍/👎', () => {
    render(<AnswerCard answer={DEMO_ANSWER} />);
    expect(screen.getByRole('button', { name: 'تقييم إيجابي' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تقييم سلبي' })).toBeInTheDocument();
  });
});
