import { render, screen } from '@testing-library/react';
import { ContractFindingsPanel } from './ContractFindingsPanel';
import type { ContractFinding } from '@/lib/types';

const F = {
  id: 'f1',
  kind: 'missing_clause',
  kind_label: 'بند غير مرصود',
  severity: 'عالٍ',
  title: 'لا يوجد بند للقانون الواجب التطبيق',
  explanation: '',
  suggestion: null,
  evidence: [],
  verification: null,
} as unknown as ContractFinding;

describe('ContractFindingsPanel — locked', () => {
  it('قبل السداد: العنوان والدرجة بلا قائمة قابلة للفتح وبعلامة «بعد السداد»', () => {
    const { container } = render(<ContractFindingsPanel findings={[F]} model="ok" locked />);
    expect(screen.getByText(F.title)).toBeInTheDocument();
    expect(screen.getByText('عالٍ')).toBeInTheDocument();
    expect(screen.getByText('التفاصيل بعد السداد')).toBeInTheDocument();
    expect(container.querySelector('details')).toBeNull();
  });

  it('بعد السداد: تفصيل قابل للفتح', () => {
    const { container } = render(<ContractFindingsPanel findings={[{ ...F, explanation: 'شرح' }]} model="ok" />);
    expect(container.querySelector('details')).not.toBeNull();
    expect(screen.queryByText('التفاصيل بعد السداد')).not.toBeInTheDocument();
  });
});
