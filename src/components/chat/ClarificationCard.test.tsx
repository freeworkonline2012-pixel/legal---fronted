import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClarificationCard } from './ClarificationCard';
import type { ClarificationRequest } from '@/lib/types';

const REQUEST: ClarificationRequest = {
  round: 1,
  max_rounds: 2,
  reason: 'يختلف الحكم',
  questions: [
    { id: 'q1', question: 'ما نوع العقد؟', why: 'تختلف الحقوق (المادتان 87 و88)', options: ['محدد المدة', 'غير محدد المدة'], allow_multiple: false },
    { id: 'q2', question: 'ما سبب الإنهاء؟', options: ['استقالة', 'فصل'], allow_multiple: true },
  ],
};

describe('ClarificationCard', () => {
  it('يعرض الأسئلة والخيارات و«أخرى» و«لا أعرف» وتنبيه حماية البيانات، والإرسال معطّل حتى يكتمل الجواب', () => {
    render(<ClarificationCard request={REQUEST} onSubmit={jest.fn()} onSkip={jest.fn()} />);
    expect(screen.getByText(/1\. ما نوع العقد؟/)).toBeInTheDocument();
    expect(screen.getByText('تختلف الحقوق (المادتان 87 و88)')).toBeInTheDocument();
    expect(screen.getAllByLabelText('لا أعرف')).toHaveLength(2);
    expect(screen.getAllByLabelText('أخرى (اكتب إجابتك)')).toHaveLength(2);
    expect(screen.getByText(/لا تكتب أسماء أو أرقام هواتف/)).toBeInTheDocument();
    expect(screen.getByText(/الجولة 1 من 2/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إرسال الإجابات' })).toBeDisabled();
  });

  it('اختيار + «لا أعرف» + نص حر → حمولة صحيحة عند الإرسال', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<ClarificationCard request={REQUEST} onSubmit={onSubmit} onSkip={jest.fn()} />);

    await user.click(screen.getByLabelText('محدد المدة'));
    expect(screen.getByRole('button', { name: 'إرسال الإجابات' })).toBeDisabled();

    await user.click(screen.getByLabelText('استقالة'));
    await user.click(screen.getAllByLabelText('أخرى (اكتب إجابتك)')[1]);
    await user.type(screen.getByLabelText('إجابتك عن: ما سبب الإنهاء؟'), 'اتفاق ودى');

    const submit = screen.getByRole('button', { name: 'إرسال الإجابات' });
    expect(submit).toBeEnabled();
    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledWith([
      { question: 'ما نوع العقد؟', answer: 'محدد المدة', kind: 'option' },
      { question: 'ما سبب الإنهاء؟', answer: 'استقالة، اتفاق ودى', kind: 'custom' },
    ]);
  });

  it('«لا أعرف» تكفى للسؤال، والتخطى متاح دائماً', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    const onSkip = jest.fn();
    render(<ClarificationCard request={REQUEST} onSubmit={onSubmit} onSkip={onSkip} />);
    await user.click(screen.getAllByLabelText('لا أعرف')[0]);
    await user.click(screen.getAllByLabelText('لا أعرف')[1]);
    await user.click(screen.getByRole('button', { name: 'إرسال الإجابات' }));
    expect(onSubmit.mock.calls[0][0].map((a: { kind: string }) => a.kind)).toEqual(['unknown', 'unknown']);

    await user.click(screen.getByRole('button', { name: /تخطَّ وأجبنى مباشرة/ }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('أثناء الإرسال (disabled) لا يمكن الإرسال ولا التخطى', () => {
    render(<ClarificationCard request={REQUEST} onSubmit={jest.fn()} onSkip={jest.fn()} disabled />);
    expect(screen.getByRole('button', { name: 'إرسال الإجابات' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /تخطَّ وأجبنى مباشرة/ })).toBeDisabled();
  });

  it('بعد الإجابة تتحول إلى ملخص للقراءة فقط بلا أزرار', () => {
    render(
      <ClarificationCard
        request={REQUEST}
        onSubmit={jest.fn()}
        onSkip={jest.fn()}
        resolvedAnswers={[
          { question: 'ما نوع العقد؟', answer: 'محدد المدة', kind: 'option' },
          { question: 'ما سبب الإنهاء؟', answer: '', kind: 'unknown' },
        ]}
      />,
    );
    expect(screen.getByTestId('clarification-resolved')).toBeInTheDocument();
    expect(screen.getByText('محدد المدة')).toBeInTheDocument();
    expect(screen.getByText('لا أعرف')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('حالتا التخطى والاستبدال تعرضان رسالة ولا أزرار', () => {
    const { rerender } = render(<ClarificationCard request={REQUEST} onSubmit={jest.fn()} onSkip={jest.fn()} resolvedAnswers="skipped" />);
    expect(screen.getByText(/تخطّيت أسئلة التوضيح/)).toBeInTheDocument();
    rerender(<ClarificationCard request={REQUEST} onSubmit={jest.fn()} onSkip={jest.fn()} resolvedAnswers="superseded" />);
    expect(screen.getByText(/انتقلت إلى سؤال جديد/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
