import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('يعرض «سارية» لحالة active', () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByRole('status')).toHaveTextContent('سارية');
  });

  it('يعرض «معدّلة» لحالة amended', () => {
    render(<StatusBadge status="amended" />);
    expect(screen.getByRole('status')).toHaveTextContent('معدّلة');
  });

  it('يعرض «ملغاة» لحالة repealed', () => {
    render(<StatusBadge status="repealed" />);
    expect(screen.getByRole('status')).toHaveTextContent('ملغاة');
  });

  it('يحمل aria-label وصفي (نص + أيقونة + لون — WCAG 1.4.1)', () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByRole('status')).toHaveAccessibleName('سارية');
  });
});
