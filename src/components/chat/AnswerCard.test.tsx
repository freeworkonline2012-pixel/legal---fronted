import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnswerCard } from './AnswerCard';
import { DEMO_ANSWER } from '@/lib/demo-data';

describe('AnswerCard', () => {
  it('يعرض الإجابة المبسطة (بادج الثقة أُلغِى بالكامل 2026-09-25)', () => {
    render(<AnswerCard answer={DEMO_ANSWER} />);
    expect(screen.getByText(DEMO_ANSWER.answer)).toBeInTheDocument();
  });

  it('يعرض بطاقة الاستشهاد', () => {
    render(<AnswerCard answer={DEMO_ANSWER} />);
    expect(screen.getByLabelText('بطاقة استشهاد')).toBeInTheDocument();
    expect(screen.getAllByText(/المادة 110/).length).toBeGreaterThan(0);
  });

  it('لا يعرض قسم «بمعنى آخر» الثابت (كان نصاً واحداً عن إنهاء العقد يظهر تحت كل إجابة أياً كان سؤالها)', () => {
    render(<AnswerCard answer={DEMO_ANSWER} />);
    expect(screen.queryByRole('button', { name: /بمعنى آخر/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/بمعنى أبسط/)).not.toBeInTheDocument();
  });

  it('يعرض الشكل القديم (نص + بطاقات استشهاد) عندما لا توجد إجابة منظَّمة', () => {
    render(<AnswerCard answer={DEMO_ANSWER} />);
    expect(screen.queryByTestId('structured-answer')).not.toBeInTheDocument();
  });

  it('يعرض الإجابة المنظَّمة عندما تكون structured صالحة، ويحتفظ بالتقييم', () => {
    render(
      <AnswerCard
        answer={{
          ...DEMO_ANSWER,
          structured: {
            direct_answer: 'نعم، لك تعويض.',
            rulings: [],
            warnings: [],
            open_issues: [],
            facts_to_confirm: [],
            not_covered: [],
          },
        }}
      />,
    );
    expect(screen.getByTestId('structured-answer')).toBeInTheDocument();
    expect(screen.getByText('نعم، لك تعويض.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تقييم إيجابي' })).toBeInTheDocument();
  });

  it('يرجع للشكل القديم دون انهيار عندما تكون structured فاسدة', () => {
    render(
      <AnswerCard
        answer={{ ...DEMO_ANSWER, structured: { rulings: 'x' } as unknown as never }}
      />,
    );
    expect(screen.queryByTestId('structured-answer')).not.toBeInTheDocument();
    expect(screen.getByText(DEMO_ANSWER.answer)).toBeInTheDocument();
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
