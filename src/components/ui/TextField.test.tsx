import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextField } from './TextField';

describe('TextField', () => {
  it('يعرض التسمية ويربطها بالحقل عبر htmlFor', () => {
    render(<TextField label="البريد الإلكتروني" />);
    const input = screen.getByLabelText('البريد الإلكتروني');
    expect(input).toBeInTheDocument();
  });

  it('يعرض رسالة الخطأ مع role=alert ويضبط aria-invalid وaria-describedby', () => {
    render(<TextField label="البريد الإلكتروني" error="بريد غير صحيح" />);
    const input = screen.getByLabelText('البريد الإلكتروني');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('بريد غير صحيح');
    expect(alert).toHaveAttribute('id', describedBy);
  });

  it('يعرض رسالة مساعدة عند عدم وجود خطأ', () => {
    render(<TextField label="الاسم" helper="مثال: أحمد محمد" />);
    expect(screen.getByText('مثال: أحمد محمد')).toBeInTheDocument();
  });

  it('يستدعي onChange عند الكتابة', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<TextField label="البريد" value="" onChange={onChange} />);
    await user.type(screen.getByLabelText('البريد'), 'a');
    expect(onChange).toHaveBeenCalled();
  });

  it('يعرض زر مسح ✕ عند clearable مع نص ويستدعي onClear', async () => {
    const user = userEvent.setup();
    const onClear = jest.fn();
    render(<TextField label="البحث" value="نص موجود" clearable onClear={onClear} />);
    await user.click(screen.getByRole('button', { name: 'مسح الحقل' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
