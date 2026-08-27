import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RatingControl } from './RatingControl';

describe('RatingControl', () => {
  it('يعرض سؤال التقييم والزرين 👍/👎', () => {
    render(<RatingControl answerId="a1" />);
    expect(screen.getByText('هل كانت الإجابة مفيدة؟')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تقييم إيجابي' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تقييم سلبي' })).toBeInTheDocument();
  });

  it('يعرض تأكيد الشكر فوراً عند اختيار 👍 (بدون خادم)', async () => {
    const user = userEvent.setup();
    render(<RatingControl answerId="a1" />);
    await user.click(screen.getByRole('button', { name: 'تقييم إيجابي' }));
    expect(screen.getByRole('status')).toHaveTextContent(/شكراً/);
  });

  it('يرسل عقد feedback الجديد {answer_id, rating, comment} عند اختيار 👎', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<RatingControl answerId="a1" onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'تقييم سلبي' }));

    const noteField = screen.getByLabelText(/ما الخطأ/);
    await user.type(noteField, 'الإجابة غير دقيقة');
    await user.click(screen.getByRole('button', { name: 'إرسال الملاحظة' }));

    expect(onSubmit).toHaveBeenCalledWith({
      answer_id: 'a1',
      rating: -1,
      comment: 'الإجابة غير دقيقة',
    });
    expect(screen.getByRole('status')).toHaveTextContent(/شكراً/);
  });

  it('يرسل rating: 1 عند اختيار 👍 عبر onSubmit', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<RatingControl answerId="a1" onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'تقييم إيجابي' }));
    expect(onSubmit).toHaveBeenCalledWith({ answer_id: 'a1', rating: 1, comment: undefined });
  });

  it('يعرض رسالة خطأ عند فشل الحفظ', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockRejectedValue(new Error('network'));
    render(<RatingControl answerId="a1" onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'تقييم إيجابي' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/تعذّر حفظ التقييم/);
  });

  it('يعرض توجيه تسجيل الدخول عند خطأ 401', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockRejectedValue(new Error('فشل طلب الخلفية (HTTP 401)'));
    render(<RatingControl answerId="a1" onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'تقييم إيجابي' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/سجّل الدخول أولاً/);
  });
});
