/**
 * اختبارات ContractDraftingScreen — صفحة «صياغة العقود» (قيد الإعداد).
 * تضمن: العنوان الصحيح، تنبيه «قيد الإعداد» الصريح (لا ادعاء بوظيفة)، وروابط الخدمتين العاملتين.
 */

import { render, screen } from '@testing-library/react';
import { ContractDraftingScreen } from './ContractDraftingScreen';

describe('ContractDraftingScreen', () => {
  it('يعرض عنوان «صياغة العقود» وتنبيه قيد الإعداد', () => {
    render(<ContractDraftingScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'صياغة العقود' })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('قيد الإعداد');
  });

  it('يوجّه إلى مراجعة العقود وترجمة العقود', () => {
    render(<ContractDraftingScreen />);
    expect(screen.getByRole('link', { name: 'مراجعة العقود' })).toHaveAttribute('href', '/contracts');
    expect(screen.getByRole('link', { name: 'ترجمة العقود' })).toHaveAttribute('href', '/translation');
  });
});
