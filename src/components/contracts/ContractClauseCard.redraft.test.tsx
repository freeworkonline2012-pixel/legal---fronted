import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContractClauseCard } from './ContractClauseCard';
import type { ContractClauseItem } from '@/lib/types';
import { ApiError, proposeClauseRedraft } from '@/lib/api-client';

jest.mock('@/lib/api-client', () => {
  const actual = jest.requireActual('@/lib/api-client');
  return { ...actual, proposeClauseRedraft: jest.fn() };
});

const mockedPropose = proposeClauseRedraft as jest.MockedFunction<typeof proposeClauseRedraft>;

const CLAUSE: ContractClauseItem = {
  id: 'clause-7',
  clause_index: 7,
  clause_label: 'البند السابع',
  clause_title: 'الشرط الجزائى',
  clause_type_guess: 'compensation,financial_impact',
  clause_text: 'غرامة تأخير 5% ولا يجوز تخفيضها.',
  assessment_status: 'يحتاج مراجعة',
  assessment_reasoning: 'البند يمنع تخفيض التعويض الاتفاقى.',
  matched_articles: [
    {
      law: 'القانون المدنى 131/1948',
      law_no: 131,
      law_year: 1948,
      article_no: 224,
      snippet: 'نص المادة.',
      official_url: null,
    },
  ],
  assessment_confidence: 0.8,
};

describe('ContractClauseCard — معايير المراجعة والصياغة المقترحة', () => {
  beforeEach(() => mockedPropose.mockReset());

  it('يعرض وسوم معايير المراجعة بالعربية', () => {
    render(<ContractClauseCard clause={CLAUSE} contractId="c1" />);
    expect(screen.getByText('التعويض')).toBeInTheDocument();
    expect(screen.getByText('الأثر المالى')).toBeInTheDocument();
  });

  it('يظهر زر الصياغة لبند يحتاج مراجعة وله سند، ويعرض الناتج مع التنويه', async () => {
    mockedPropose.mockResolvedValue({
      ...CLAUSE,
      suggested_redraft: {
        text: 'غرامة تأخير 5% مع جواز تخفيضها قضاءً.',
        changes: ['إزالة منع التخفيض بسبب المادة 224'],
        disclaimer: 'صياغة مقترحة للاسترشاد، تُراجَع من محامٍ قبل الاعتماد؛ وليست نصاً معتمداً.',
      },
    });
    render(<ContractClauseCard clause={CLAUSE} contractId="c1" />);
    await userEvent.click(screen.getByRole('button', { name: 'اقترح صياغة بديلة' }));
    expect(await screen.findByText('غرامة تأخير 5% مع جواز تخفيضها قضاءً.')).toBeInTheDocument();
    expect(screen.getByText(/تُراجَع من محامٍ/)).toBeInTheDocument();
    expect(mockedPropose).toHaveBeenCalledWith('c1', 'clause-7');
  });

  it('يعرض رسالة الخلفية عند الرفض ولا يعرض صياغة', async () => {
    mockedPropose.mockRejectedValue(new ApiError(422, 'لم تجتز الصياغة المقترحة فحوص الأمان الآلية'));
    render(<ContractClauseCard clause={CLAUSE} contractId="c1" />);
    await userEvent.click(screen.getByRole('button', { name: 'اقترح صياغة بديلة' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('لم تجتز الصياغة'));
    expect(screen.queryByRole('region', { name: 'صياغة مقترحة للبند' })).not.toBeInTheDocument();
  });

  it('لا يظهر الزر لبند بلا سند أو لحالة أخرى أو بلا معرّف عقد', () => {
    const { rerender } = render(<ContractClauseCard clause={{ ...CLAUSE, matched_articles: [] }} contractId="c1" />);
    expect(screen.queryByRole('button', { name: 'اقترح صياغة بديلة' })).not.toBeInTheDocument();
    rerender(<ContractClauseCard clause={{ ...CLAUSE, assessment_status: 'سليم' }} contractId="c1" />);
    expect(screen.queryByRole('button', { name: 'اقترح صياغة بديلة' })).not.toBeInTheDocument();
    rerender(<ContractClauseCard clause={CLAUSE} />);
    expect(screen.queryByRole('button', { name: 'اقترح صياغة بديلة' })).not.toBeInTheDocument();
  });

  it('يعرض صياغة مخزَّنة سابقاً دون زر', () => {
    render(
      <ContractClauseCard
        clause={{ ...CLAUSE, suggested_redraft: { text: 'صياغة مخزنة.', changes: [], disclaimer: 'تنويه' } }}
        contractId="c1"
      />,
    );
    expect(screen.getByText('صياغة مخزنة.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'اقترح صياغة بديلة' })).not.toBeInTheDocument();
  });
});
