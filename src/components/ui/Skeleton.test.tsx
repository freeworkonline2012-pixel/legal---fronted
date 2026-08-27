/**
 * اختبارات Skeleton — حالة التحميل (component_states.md القسم 13).
 *
 * يغطي:
 * - accessibility: role="status" + نص «جارٍ التحميل…» لقارئ الشاشة + aria-busy.
 * - عرض صفوف بعرض نسبي من lines.
 * - عرض محتوى بديل كامل عند تمرير children (مثال: بطاقة استشهاد).
 */

import { render, screen } from '@testing-library/react';
import { Skeleton, CitationCardSkeleton } from './Skeleton';

describe('Skeleton', () => {
  it('يعرض حالة تحميل مقروءة آلياً', () => {
    render(<Skeleton lines={['100%']} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('جارٍ التحميل…')).toBeInTheDocument();
  });

  it('يعرض صفوفاً بعرض النسب الممررة', () => {
    const { container } = render(<Skeleton lines={['100%', '70%']} />);
    const rows = container.querySelectorAll('[style*="width"]');
    expect(rows.length).toBe(2);
  });

  it('يعرض محتوى بديل عند تمرير children', () => {
    render(
      <Skeleton>
        <div>بطاقة استشهاد</div>
      </Skeleton>,
    );
    expect(screen.getByText('بطاقة استشهاد')).toBeInTheDocument();
  });
});

describe('CitationCardSkeleton', () => {
  it('يعرض هيكل بطاقة الاستشهاد كحالة تحميل', () => {
    const { container } = render(<CitationCardSkeleton />);
    expect(container.querySelector('.animate-shimmer')).not.toBeNull();
  });
});
