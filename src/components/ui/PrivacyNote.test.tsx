/**
 * اختبارات PrivacyNote — نص الخصوصية قرب حقل السؤال (P5 + 151/2020).
 *
 * يغطي:
 * - النص الافتراضي مع أيقونة القفل (خصوصية معالجة السؤال).
 * - نص الجلسة الخفية عند التفعيل (شخصية 2 — P1).
 */

import { render, screen } from '@testing-library/react';
import { PrivacyNote } from './PrivacyNote';

describe('PrivacyNote', () => {
  it('يعرض نص الخصوصية الافتراضي', () => {
    render(<PrivacyNote />);
    expect(screen.getByText(/سؤالك يُعالج بتشفير/)).toBeInTheDocument();
    expect(screen.getByText(/151\/2020/)).toBeInTheDocument();
  });

  it('يعرض نص الجلسة الخفية عند التفعيل', () => {
    render(<PrivacyNote hiddenSession />);
    expect(screen.getByText(/جلسة خفية مفعّلة/)).toBeInTheDocument();
    expect(screen.queryByText(/سؤالك يُعالج بتشفير/)).not.toBeInTheDocument();
  });
});
