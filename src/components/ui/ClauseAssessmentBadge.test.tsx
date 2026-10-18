import { render, screen } from '@testing-library/react';
import { ClauseAssessmentBadge } from './ClauseAssessmentBadge';

describe('ClauseAssessmentBadge', () => {
  it('يعرض حالة "سليم" بصياغة "لا مخالفة ظاهرة" حتى لا توحى باعتماد نهائى', () => {
    render(<ClauseAssessmentBadge status="سليم" />);
    expect(screen.getByRole('status', { name: 'تقييم البند: لا مخالفة ظاهرة' })).toHaveTextContent('لا مخالفة ظاهرة');
  });

  it('يعرض شارة "يحتاج مراجعة"', () => {
    render(<ClauseAssessmentBadge status="يحتاج مراجعة" />);
    expect(screen.getByRole('status', { name: 'تقييم البند: يحتاج مراجعة' })).toHaveTextContent('يحتاج مراجعة');
  });

  it('يعرض نصاً مختصراً لحالة "لا يوجد نص قانونى مصرى مفهرَس ذو صلة مباشرة"', () => {
    render(<ClauseAssessmentBadge status="لا يوجد نص قانونى مصرى مفهرَس ذو صلة مباشرة" />);
    expect(
      screen.getByRole('status', { name: 'تقييم البند: لا يوجد نص قانونى مصرى مفهرَس ذو صلة مباشرة' }),
    ).toHaveTextContent('لا يوجد نص مفهرَس');
  });
});
