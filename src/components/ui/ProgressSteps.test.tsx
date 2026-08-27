import { render, screen } from '@testing-library/react';
import { ProgressSteps, DEFAULT_PROGRESS_STEPS } from './ProgressSteps';

describe('ProgressSteps', () => {
  it('يعرض الخطوات الثلاث النصية', () => {
    render(<ProgressSteps currentIndex={0} />);
    for (const step of DEFAULT_PROGRESS_STEPS) {
      expect(screen.getByText(step.label)).toBeInTheDocument();
    }
  });

  it('يشير للخطوة النشطة بـ aria-current=step', () => {
    render(<ProgressSteps currentIndex={1} />);
    const active = screen.getByText(DEFAULT_PROGRESS_STEPS[1].label);
    expect(active.closest('li')).toHaveAttribute('aria-current', 'step');
  });

  it('يحوّل الخطوات السابقة لحالة done (✓)', () => {
    render(<ProgressSteps currentIndex={2} />);
    // الخطوة 0 منجزة — نتحقق أن لها أيقونة النجاح بصرياً عبر النص الملون
    const done = screen.getByText(DEFAULT_PROGRESS_STEPS[0].label);
    expect(done.closest('li')).toHaveClass('text-success');
  });
});
