import { render, screen } from '@testing-library/react';
import { VerificationNote } from './VerificationNote';
import { ContractClauseCard } from './ContractClauseCard';
import { ContractFindingsPanel } from './ContractFindingsPanel';
import type { ContractClauseItem, ContractFinding, VerificationResult } from '@/lib/types';

const UNCONFIRMED: VerificationResult = { status: 'unconfirmed', basis: 'refuted', reason: 'البند يعفى صراحة من الإنذار.', quote: 'دون حاجة إلى إنذار أو تنبيه' };
const CONFIRMED: VerificationResult = { status: 'confirmed', basis: 'confirmed', reason: 'لم أجد ما ينقض الملاحظة.', quote: null };

const CLAUSE: ContractClauseItem = {
  id: 'c1',
  clause_index: 13,
  clause_label: 'البند الثالث عشر',
  clause_title: null,
  clause_type_guess: null,
  clause_text: 'يجوز للطرف الثانى فسخ العقد دون حاجة إلى إنذار أو تنبيه.',
  assessment_status: 'يحتاج مراجعة',
  assessment_reasoning: 'لا يوجد اتفاق صريح على الإعفاء من الإعذار.',
  matched_articles: [],
  assessment_confidence: 0.6,
};

describe('VerificationNote', () => {
  it('لا شىء بلا نتيجة تحقق', () => {
    const { container } = render(<VerificationNote verification={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('غير المؤكدة: وسم تحذيرى مع السبب والاقتباس الموثَّق', () => {
    render(<VerificationNote verification={UNCONFIRMED} />);
    expect(screen.getByRole('note', { name: 'غير مؤكدة — تحتاج مراجعة بشرية' })).toBeInTheDocument();
    expect(screen.getByText('البند يعفى صراحة من الإنذار.')).toBeInTheDocument();
    expect(screen.getByText('دون حاجة إلى إنذار أو تنبيه')).toBeInTheDocument();
  });

  it('المؤكدة: تذكر اجتياز التحقق بلا اقتباس', () => {
    render(<VerificationNote verification={CONFIRMED} />);
    expect(screen.getByRole('note', { name: 'اجتازت التحقق المستقل' })).toBeInTheDocument();
  });

  it('بطاقة البند تعرض الوسم، وبدونه لا تعرضه', () => {
    const { rerender } = render(<ContractClauseCard clause={{ ...CLAUSE, verification: UNCONFIRMED }} />);
    expect(screen.getByRole('note', { name: 'غير مؤكدة — تحتاج مراجعة بشرية' })).toBeInTheDocument();
    rerender(<ContractClauseCard clause={CLAUSE} />);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('لوحة ملاحظات العقد ككل تشير إلى غير المؤكدة فى العنوان وفى التفصيل', () => {
    const f: ContractFinding = {
      id: 'model:conflict:1', kind: 'conflict', kind_label: 'تعارض محتمل بين بندين', severity: 'عالٍ', title: 'تعارض الملكية',
      explanation: 'قد ينقل بند ما يحجزه آخر.', suggestion: null, evidence: [], source: 'model', verification: UNCONFIRMED,
    };
    render(<ContractFindingsPanel findings={[f]} model="ok" />);
    expect(screen.getAllByText('غير مؤكدة').length).toBeGreaterThan(0);
    expect(screen.getByRole('note', { name: 'غير مؤكدة — تحتاج مراجعة بشرية' })).toBeInTheDocument();
  });
});
