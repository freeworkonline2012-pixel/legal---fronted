import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GovernanceCitationCard } from './GovernanceCitationCard';
import type { GovernanceLegalBasis } from '@/lib/types';

const BASIS: GovernanceLegalBasis = {
  law: 'قانون مكافحة غسل الأموال',
  law_no: 80,
  law_year: 2002,
  article_no: 12,
  snippet: 'تلتزم المؤسسات المالية بالإبلاغ عن العمليات المشبوهة فوراً.',
  official_url: 'https://fra.gov.eg/aml-law-80-2002.pdf',
};

describe('GovernanceCitationCard', () => {
  it('يعرض اسم القانون ورقم المادة', () => {
    render(<GovernanceCitationCard basis={BASIS} />);
    expect(screen.getByText(/قانون مكافحة غسل الأموال 80\/2002/)).toBeInTheDocument();
    expect(screen.getByText(/المادة 12/)).toBeInTheDocument();
  });

  it('يفتح النص الحرفي عند النقر', async () => {
    const user = userEvent.setup();
    render(<GovernanceCitationCard basis={BASIS} />);
    expect(screen.queryByText(BASIS.snippet)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /عرض النص الحرفي/ }));
    expect(screen.getByText(BASIS.snippet)).toBeInTheDocument();
  });

  it('يعرض رابط النص الرسمي بتبويب جديد عند توفره', () => {
    render(<GovernanceCitationCard basis={BASIS} />);
    const link = screen.getByRole('link', { name: /فتح النص الرسمي/ });
    expect(link).toHaveAttribute('href', BASIS.official_url as string);
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('يعرض رسالة بديلة بدل الرابط عند غياب official_url (nullable فى عقد backend)', () => {
    render(<GovernanceCitationCard basis={{ ...BASIS, official_url: null }} />);
    expect(screen.queryByRole('link', { name: /فتح النص الرسمي/ })).not.toBeInTheDocument();
    expect(screen.getByText(/لا يتوفر رابط رسمي/)).toBeInTheDocument();
  });
});
