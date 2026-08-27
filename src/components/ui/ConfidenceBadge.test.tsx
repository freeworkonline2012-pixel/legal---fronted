import { render, screen } from '@testing-library/react';
import { ConfidenceBadge } from './ConfidenceBadge';

describe('ConfidenceBadge', () => {
  it('يعرض «ثقة عالية» لمستوى high', () => {
    render(<ConfidenceBadge level="high" />);
    expect(screen.getByRole('status')).toHaveTextContent('ثقة عالية');
  });

  it('يعرض «ثقة متوسطة» لمستوى medium', () => {
    render(<ConfidenceBadge level="medium" />);
    expect(screen.getByRole('status')).toHaveTextContent('ثقة متوسطة');
  });

  it('يعرض «ثقة منخفضة» لمستوى low', () => {
    render(<ConfidenceBadge level="low" />);
    expect(screen.getByRole('status')).toHaveTextContent('ثقة منخفضة');
  });

  it('يشمل العتبة الرقمية في aria-label', () => {
    render(<ConfidenceBadge level="high" />);
    expect(screen.getByRole('status')).toHaveAccessibleName(/0\.85/);
  });
});
