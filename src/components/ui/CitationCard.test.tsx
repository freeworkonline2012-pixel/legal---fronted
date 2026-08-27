import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CitationCard } from './CitationCard';
import { DEMO_CITATION } from '@/lib/demo-data';

describe('CitationCard', () => {
  it('يعرض اسم القانون ورقم المادة', () => {
    render(<CitationCard citation={DEMO_CITATION} />);
    expect(screen.getByText(/قانون العمل 12\/2003/)).toBeInTheDocument();
    expect(screen.getByText(/المادة 110/)).toBeInTheDocument();
  });

  it('يعرض حالة النفاذ كشارة نصية', () => {
    render(<CitationCard citation={DEMO_CITATION} />);
    expect(screen.getByRole('status')).toHaveTextContent('سارية');
  });

  it('يفتح النص الحرفي عند النقر على «عرض النص الحرفي»', async () => {
    const user = userEvent.setup();
    render(<CitationCard citation={DEMO_CITATION} />);
    const toggle = screen.getByRole('button', { name: /عرض النص الحرفي/ });
    expect(screen.queryByText(DEMO_CITATION.snippet)).not.toBeInTheDocument();

    await user.click(toggle);
    expect(screen.getByText(DEMO_CITATION.snippet)).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('يعرض رابط النص الرسمي بتبويب جديد', () => {
    render(<CitationCard citation={DEMO_CITATION} />);
    const link = screen.getByRole('link', { name: /فتح النص الرسمي/ });
    expect(link).toHaveAttribute('href', DEMO_CITATION.official_url);
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('يعرض تنبيهاً إضافياً للمادة الملغاة', () => {
    const repealed = { ...DEMO_CITATION, status: 'repealed' as const };
    render(<CitationCard citation={repealed} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/ملغاة/);
  });

  it('يعرض حالة «استشهاد قيد التحقق» عند فشل التحقق ولا يعرضه كحقيقة', () => {
    render(<CitationCard citation={DEMO_CITATION} verificationFailed />);
    expect(screen.getByLabelText('استشهاد قيد التحقق')).toBeInTheDocument();
    expect(screen.queryByText(/قانون العمل 12\/2003/)).not.toBeInTheDocument();
  });
});
