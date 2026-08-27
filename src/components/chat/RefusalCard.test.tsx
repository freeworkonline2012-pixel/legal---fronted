import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RefusalCard } from './RefusalCard';
import { DEMO_REFUSAL } from '@/lib/demo-data';

describe('RefusalCard', () => {
  it('يعرض رسالة الرفض وشارة الثقة المنخفضة', () => {
    render(<RefusalCard answer={DEMO_REFUSAL} />);
    expect(screen.getByRole('status')).toHaveTextContent('ثقة منخفضة');
    expect(screen.getByText(/لن نخمّن/)).toBeInTheDocument();
  });

  it('يعرض ثلاث خطوات تالية (لا طريق مسدود)', () => {
    render(<RefusalCard answer={DEMO_REFUSAL} />);
    expect(screen.getByRole('button', { name: /أعد صياغة السؤال/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /حوّل لمحامٍ بشري/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /اسأل في مجال آخر/ })).toBeInTheDocument();
  });

  it('يستدعي onRephrase عند النقر', async () => {
    const user = userEvent.setup();
    const onRephrase = jest.fn();
    render(<RefusalCard answer={DEMO_REFUSAL} onRephrase={onRephrase} />);
    await user.click(screen.getByRole('button', { name: /أعد صياغة السؤال/ }));
    expect(onRephrase).toHaveBeenCalledTimes(1);
  });
});
