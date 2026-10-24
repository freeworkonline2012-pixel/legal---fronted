import { render, screen } from '@testing-library/react';
import { ContractFindingsPanel } from './ContractFindingsPanel';
import type { ContractFinding } from '@/lib/types';

const F: ContractFinding = {
  id: 'open:6:1',
  kind: 'open_term',
  kind_label: 'شرط مفتوح',
  severity: 'عالٍ',
  title: 'مقابل مالى يُترك تحديده إلى وقت لاحق',
  explanation: 'يُحدَّد الرسم لاحقاً دون آلية.',
  suggestion: 'تحديد السقف.',
  evidence: [{ clause_index: 6, clause_label: 'البند السادس', quote: 'تحدد رسوم الاستضافة بعد انتهاء التنفيذ' }],
  source: 'rule',
};

describe('ContractFindingsPanel', () => {
  it('لا يعرض شيئاً لعقد لم يُحلَّل (findings غائبة)', () => {
    const { container } = render(<ContractFindingsPanel findings={undefined} model={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('يعرض الملاحظة بنوعها ودرجتها واقتباسها الحرفى والمعالجة المقترحة', () => {
    render(<ContractFindingsPanel findings={[F]} model="ok" />);
    expect(screen.getByRole('heading', { name: 'ملاحظات على العقد ككل' })).toBeInTheDocument();
    expect(screen.getByText('شرط مفتوح')).toBeInTheDocument();
    expect(screen.getByText('عالٍ')).toBeInTheDocument();
    expect(screen.getByText('تحدد رسوم الاستضافة بعد انتهاء التنفيذ')).toBeInTheDocument();
    expect(screen.getByText(/المعالجة المقترحة/)).toBeInTheDocument();
  });

  it('قائمة فارغة ⇒ يقول إنه لم تُرصد ملاحظات بالفحوص المطبَّقة (لا يدّعى سلامة العقد)', () => {
    render(<ContractFindingsPanel findings={[]} model="ok" />);
    expect(screen.getByText(/لم تُرصد ملاحظات على مستوى العقد ككل بالفحوص المطبَّقة/)).toBeInTheDocument();
  });

  it('تعذّر فحص التعارض أو تخطّيه ⇒ ملاحظة نطاق صريحة', () => {
    const { rerender } = render(<ContractFindingsPanel findings={[F]} model="error" />);
    expect(screen.getByRole('status')).toHaveTextContent('تعذّر إتمام فحص التعارض');
    rerender(<ContractFindingsPanel findings={[F]} model="skipped" />);
    expect(screen.getByRole('status')).toHaveTextContent('أطول من الحد المعتمد');
  });
});
