import { render, screen } from '@testing-library/react';
import { GovernancePresentationView } from './GovernancePresentationView';
import type { GovernancePresentation } from '@/lib/types';

const BASE: GovernancePresentation = {
  direct_answer: 'الإجراء غير متوافق مع النصوص القانونية المسترجَعة. التوصية: غير موصى به.',
  verdict_kind: 'تفسير',
  verdict_kind_note: 'الحكم تطبيق من المنصة للنصوص الحرفية أدناه على الواقعة المذكورة، وليس نصاً صريحاً فى القانون.',
  warnings: ['المادة 12 من قانون 80/2002 معدّلة.'],
  open_issues: ['لم تُحدَّد مادة عقوبة منطبقة بثقة كافية.'],
  facts_to_confirm: ['تأكد من استيفاء: الحصول على موافقة مسبقة'],
};

describe('GovernancePresentationView', () => {
  it('يعرض الجواب المباشر ووسم «تفسير» مع تعليله', () => {
    render(<GovernancePresentationView presentation={BASE} />);
    expect(screen.getByText(BASE.direct_answer)).toBeInTheDocument();
    expect(screen.getByTestId('verdict-kind')).toHaveTextContent('تفسير');
    expect(screen.getByText(/وليس نصاً صريحاً/)).toBeInTheDocument();
  });

  it('يعرض التنبيهات والمسائل المفتوحة والوقائع', () => {
    render(<GovernancePresentationView presentation={BASE} />);
    expect(screen.getByText('المادة 12 من قانون 80/2002 معدّلة.')).toBeInTheDocument();
    expect(screen.getByText('لم تُحدَّد مادة عقوبة منطبقة بثقة كافية.')).toBeInTheDocument();
    expect(screen.getByText('تأكد من استيفاء: الحصول على موافقة مسبقة')).toBeInTheDocument();
  });

  it('لا يعرض وسم الحكم عندما verdict_kind=null (حكم غير محسوم)', () => {
    render(
      <GovernancePresentationView
        presentation={{ ...BASE, verdict_kind: null, verdict_kind_note: null, warnings: [], open_issues: [], facts_to_confirm: [] }}
      />,
    );
    expect(screen.queryByTestId('verdict-kind')).not.toBeInTheDocument();
    expect(screen.queryByText('تنبيهات')).not.toBeInTheDocument();
  });

  it('لا يعرض شيئاً ولا ينهار عند بنية ناقصة', () => {
    const { container } = render(
      <GovernancePresentationView presentation={{ direct_answer: '' } as unknown as GovernancePresentation} />,
    );
    expect(container).toBeEmptyDOMElement();
    render(<GovernancePresentationView presentation={{ direct_answer: 'جواب' } as unknown as GovernancePresentation} />);
    expect(screen.getByText('جواب')).toBeInTheDocument();
  });
});
