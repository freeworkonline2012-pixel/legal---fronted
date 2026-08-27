import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuestionInput } from './QuestionInput';
import type { QuestionInputProps } from './QuestionInput';

/** غلاف مُتحكَّم فيه لمحاكاة استخدام المكوّن داخل ChatScreen */
function Harness(props: Partial<QuestionInputProps>) {
  const [value, setValue] = useState('');
  return (
    <QuestionInput
      value={value}
      onValueChange={setValue}
      onSubmit={props.onSubmit ?? jest.fn()}
      loading={props.loading}
      disabled={props.disabled}
    />
  );
}

describe('QuestionInput', () => {
  it('يعطّل زر الإرسال عندما يكون النص أقل من 3 أحرف', () => {
    render(<Harness />);
    const submit = screen.getByRole('button', { name: 'إرسال السؤال' });
    expect(submit).toBeDisabled();
  });

  it('يمكّن زر الإرسال عند كتابة 3 أحرف فأكثر', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText(/اسأل عن حقك القانوني/), 'سؤال');
    expect(screen.getByRole('button', { name: 'إرسال السؤال' })).toBeEnabled();
  });

  it('يرسل السؤال المطبَّع (أرقام شرقية ← غربية) عند الإرسال', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<Harness onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/اسأل عن حقك القانوني/), 'مادة ١١٠ تعويض');
    await user.click(screen.getByRole('button', { name: 'إرسال السؤال' }));
    expect(onSubmit).toHaveBeenCalledWith('مادة 110 تعويض');
  });

  it('يعرض شريحة «المجال المحدد» عند اكتشاف مجال من النص', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText(/اسأل عن حقك القانوني/), 'اتنفصلت من الشغل');
    expect(screen.getByText(/المجال المحدد/)).toBeInTheDocument();
    expect(screen.getByText('قانون العمل')).toBeInTheDocument();
  });

  it('يرسل عند Ctrl/Cmd+Enter', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<Harness onSubmit={onSubmit} />);
    const textarea = screen.getByLabelText(/اسأل عن حقك القانوني/);
    await user.type(textarea, 'سؤال قانوني مهم');
    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('يستقبل قيمة خارجية (للأسئلة المقترحة/إعادة الصياغة)', () => {
    render(
      <QuestionInput
        value="سؤال من الأسئلة المقترحة"
        onValueChange={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );
    expect(screen.getByLabelText(/اسأل عن حقك القانوني/)).toHaveValue('سؤال من الأسئلة المقترحة');
  });
});
