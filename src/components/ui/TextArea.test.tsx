import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextArea } from './TextArea';

describe('TextArea', () => {
  it('يعرض التسمية ويربطها بالحقل', () => {
    render(<TextArea label="اكتب سؤالك" />);
    expect(screen.getByLabelText('اكتب سؤالك')).toBeInTheDocument();
  });

  it('يعرض رسالة الخطأ مع role=alert', () => {
    render(<TextArea label="السؤال" error="اكتب 3 أحرف على الأقل" />);
    const textarea = screen.getByLabelText('السؤال');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('اكتب 3 أحرف على الأقل');
  });

  it('يستدعي onChange عند الكتابة', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<TextArea label="السؤال" value="" onChange={onChange} />);
    await user.type(screen.getByLabelText('السؤال'), 'س');
    expect(onChange).toHaveBeenCalled();
  });

  it('يُمرِّر rows إلى عنصر textarea', () => {
    render(<TextArea label="السؤال" rows={4} />);
    expect(screen.getByLabelText('السؤال')).toHaveAttribute('rows', '4');
  });
});
