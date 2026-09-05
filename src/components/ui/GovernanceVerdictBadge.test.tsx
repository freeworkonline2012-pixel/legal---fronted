import { render, screen } from '@testing-library/react';
import { GovernanceVerdictBadge } from './GovernanceVerdictBadge';

describe('GovernanceVerdictBadge', () => {
  it('يعرض حكم "متوافق" بنص وأيقونة (لا لون وحده — WCAG 1.4.1)', () => {
    render(<GovernanceVerdictBadge verdict="متوافق" />);
    expect(screen.getByRole('status')).toHaveTextContent('متوافق');
  });

  it('يعرض حكم "غير متوافق"', () => {
    render(<GovernanceVerdictBadge verdict="غير متوافق" />);
    expect(screen.getByRole('status')).toHaveTextContent('غير متوافق');
  });

  it('يعرض حكم "متوافق جزئياً"', () => {
    render(<GovernanceVerdictBadge verdict="متوافق جزئياً" />);
    expect(screen.getByRole('status')).toHaveTextContent('متوافق جزئياً');
  });

  it('يوضّح أن "معلومات غير كافية" رفض أمين متعمَّد وليس علامة فشل', () => {
    render(<GovernanceVerdictBadge verdict="معلومات غير كافية" />);
    expect(screen.getByRole('status')).toHaveTextContent('معلومات غير كافية');
    expect(screen.getByText(/رفض أمين متعمَّد، وليس خطأً/)).toBeInTheDocument();
  });
});
