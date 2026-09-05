import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContractClauseCard } from './ContractClauseCard';
import type { ContractClauseItem } from '@/lib/types';

const CLAUSE_WITH_MATCH: ContractClauseItem = {
  id: 'clause-1',
  clause_index: 1,
  clause_label: 'البند الأول',
  clause_title: 'مدة العقد',
  clause_type_guess: null,
  clause_text: 'مدة هذا العقد سنة واحدة قابلة للتجديد.',
  assessment_status: 'يحتاج مراجعة',
  assessment_reasoning: 'تعذَّر إجراء التقييم الآلى تقنياً — يلزم مراجعة قانونية بشرية.',
  matched_articles: [
    {
      law: 'قانون التجارة',
      law_no: 17,
      law_year: 1999,
      article_no: 50,
      snippet: 'نص المادة الحرفى هنا.',
      official_url: 'https://example.gov.eg/law-17-1999.pdf',
    },
  ],
  assessment_confidence: 0,
};

const CLAUSE_NO_MATCH: ContractClauseItem = {
  ...CLAUSE_WITH_MATCH,
  id: 'clause-2',
  clause_label: 'البند الثانى',
  clause_title: null,
  assessment_status: 'لا يوجد نص قانونى مصرى مفهرَس ذو صلة مباشرة',
  assessment_reasoning: 'لا توجد مادة قانونية مصرية مفهرَسة ذات صلة مباشرة بموضوع هذا البند حتى الآن.',
  matched_articles: [],
};

describe('ContractClauseCard', () => {
  it('يعرض تسمية البند وعنوانه وشارة التقييم وسبب التقييم', () => {
    render(<ContractClauseCard clause={CLAUSE_WITH_MATCH} />);
    expect(screen.getByRole('heading', { name: 'البند الأول' })).toBeInTheDocument();
    expect(screen.getByText('مدة العقد')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /تقييم البند: يحتاج مراجعة/ })).toBeInTheDocument();
    expect(screen.getByText(CLAUSE_WITH_MATCH.assessment_reasoning!)).toBeInTheDocument();
  });

  it('يعرض المادة القانونية المطابَقة عند وجودها، ويطوى نصها الحرفى افتراضياً', () => {
    render(<ContractClauseCard clause={CLAUSE_WITH_MATCH} />);
    expect(screen.getByText(/قانون التجارة 17\/1999 — المادة 50/)).toBeInTheDocument();
    expect(screen.queryByText('نص المادة الحرفى هنا.')).not.toBeInTheDocument();
  });

  it('لا يعرض أى مادة مطابَقة عند حالة "لا يوجد نص مفهرَس"', () => {
    render(<ContractClauseCard clause={CLAUSE_NO_MATCH} />);
    expect(screen.queryByText(/قانون التجارة/)).not.toBeInTheDocument();
  });

  it('يظهر نص البند الكامل عند الضغط على زر العرض', async () => {
    const user = userEvent.setup();
    render(<ContractClauseCard clause={CLAUSE_WITH_MATCH} />);
    expect(screen.queryByText(CLAUSE_WITH_MATCH.clause_text)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'عرض نص البند كاملاً' }));
    expect(screen.getByText(CLAUSE_WITH_MATCH.clause_text)).toBeInTheDocument();
  });
});
