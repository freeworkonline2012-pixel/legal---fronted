import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GovernanceLawCitationGroupCard } from './GovernanceLawCitationGroupCard';

const ARTICLES = [
  { articleNo: 6, snippet: 'نص المادة 6 الحرفى.' },
  { articleNo: 8, snippet: 'نص المادة 8 الحرفى.' },
];

describe('GovernanceLawCitationGroupCard', () => {
  it('يعرض اسم القانون مرة واحدة، وكل مادة برقمها الخاص', () => {
    render(
      <GovernanceLawCitationGroupCard
        law="قانون مكافحة غسل الأموال"
        lawNo={80}
        lawYear={2002}
        officialUrl="https://fra.gov.eg/aml-law-80-2002.pdf"
        articles={ARTICLES}
      />,
    );

    expect(screen.getAllByText(/قانون مكافحة غسل الأموال 80\/2002/)).toHaveLength(1);
    expect(screen.getByText('المادة 6')).toBeInTheDocument();
    expect(screen.getByText('المادة 8')).toBeInTheDocument();
  });

  it('يتيح طى/عرض نص كل مادة بشكل مستقل عن المواد الأخرى فى نفس البطاقة', async () => {
    const user = userEvent.setup();
    render(
      <GovernanceLawCitationGroupCard
        law="قانون مكافحة غسل الأموال"
        lawNo={80}
        lawYear={2002}
        officialUrl="https://fra.gov.eg/aml-law-80-2002.pdf"
        articles={ARTICLES}
      />,
    );

    expect(screen.queryByText('نص المادة 6 الحرفى.')).not.toBeInTheDocument();
    expect(screen.queryByText('نص المادة 8 الحرفى.')).not.toBeInTheDocument();

    const toggles = screen.getAllByRole('button', { name: 'عرض النص الحرفي' });
    expect(toggles).toHaveLength(2);

    await user.click(toggles[0]);
    expect(screen.getByText('نص المادة 6 الحرفى.')).toBeInTheDocument();
    expect(screen.queryByText('نص المادة 8 الحرفى.')).not.toBeInTheDocument();

    await user.click(toggles[1]);
    expect(screen.getByText('نص المادة 6 الحرفى.')).toBeInTheDocument();
    expect(screen.getByText('نص المادة 8 الحرفى.')).toBeInTheDocument();
  });

  it('يعرض رابط «فتح النص الرسمي» مرة واحدة لكل القانون عند توفر officialUrl', () => {
    render(
      <GovernanceLawCitationGroupCard
        law="قانون مكافحة غسل الأموال"
        lawNo={80}
        lawYear={2002}
        officialUrl="https://fra.gov.eg/aml-law-80-2002.pdf"
        articles={ARTICLES}
      />,
    );

    const links = screen.getAllByRole('link', { name: /فتح النص الرسمي/ });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', 'https://fra.gov.eg/aml-law-80-2002.pdf');
    expect(links[0]).toHaveAttribute('target', '_blank');
  });

  it('يعرض ملاحظة بديلة بدل الرابط عندما officialUrl=null', () => {
    render(
      <GovernanceLawCitationGroupCard law="قانون تجريبى" lawNo={1} lawYear={2000} officialUrl={null} articles={ARTICLES} />,
    );

    expect(screen.queryByRole('link', { name: /فتح النص الرسمي/ })).not.toBeInTheDocument();
    expect(screen.getByText('لا يتوفر رابط رسمي لهذا القانون حالياً.')).toBeInTheDocument();
  });
});
