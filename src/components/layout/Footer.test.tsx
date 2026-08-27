/**
 * اختبارات Footer — تذييل الصفحة.
 *
 * يغطي:
 * - إخلاء المسؤولية ظاهر دائماً (متطلب PRD القسم 10 — لا يُخفى في أي واجهة).
 * - روابط حقوق البيانات (151/2020) تظهر فقط عند showDataRights.
 */

import { render, screen } from '@testing-library/react';
import { Footer } from './Footer';

describe('Footer', () => {
  it('يعرض إخلاء المسؤولية دائماً', () => {
    render(<Footer />);
    expect(screen.getByLabelText('إخلاء مسؤولية')).toBeInTheDocument();
    expect(screen.getByText(/معلومة قانونية موثّقة بالمصدر/)).toBeInTheDocument();
  });

  it('لا يعرض روابط حقوق البيانات افتراضياً', () => {
    render(<Footer />);
    expect(screen.queryByRole('navigation', { name: 'حقوق البيانات' })).not.toBeInTheDocument();
  });

  it('يعرض روابط تصدير/حذف البيانات عند showDataRights', () => {
    render(<Footer showDataRights />);
    expect(screen.getByRole('navigation', { name: 'حقوق البيانات' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /تصدير بياناتي/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /حذف حسابي/ })).toBeInTheDocument();
  });
});
