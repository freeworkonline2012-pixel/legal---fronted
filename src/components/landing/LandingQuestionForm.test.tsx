import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LandingQuestionForm } from './LandingQuestionForm';

// ملاحظة: يجب أن يبدأ اسم المتغير بـ mock ليسمح Jest بالإشارة إليه داخل
// factory دالة jest.mock (الـ factory لا يرى متغيرات النطاق الخارجي عدا
// تلك المبدوءة بـ mock — وفق توثيق Jest الرسمي).
const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('LandingQuestionForm', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('يعطّل زر الإرسال حتى كتابة 3 أحرف على الأقل', () => {
    render(<LandingQuestionForm />);
    expect(screen.getByRole('button', { name: 'اسأل' })).toBeDisabled();
  });

  it('ينتقل إلى /chat مع السؤال في ?q= عند الإرسال', async () => {
    const user = userEvent.setup();
    render(<LandingQuestionForm />);
    await user.type(screen.getByPlaceholderText(/اكتب سؤالك القانوني هنا/), 'حقي في التعويض');
    await user.click(screen.getByRole('button', { name: 'اسأل' }));
    expect(mockPush).toHaveBeenCalledWith('/chat?q=' + encodeURIComponent('حقي في التعويض'));
  });

  it('يُرجع الأرقام الشرقية إلى غربية في السؤال المُرسل', async () => {
    const user = userEvent.setup();
    render(<LandingQuestionForm />);
    await user.type(screen.getByPlaceholderText(/اكتب سؤالك القانوني هنا/), 'مادة ١١٠ تعويض');
    await user.click(screen.getByRole('button', { name: 'اسأل' }));
    expect(mockPush).toHaveBeenCalledWith('/chat?q=' + encodeURIComponent('مادة 110 تعويض'));
  });

  it('يرسل عند ضغط Enter داخل الحقل', async () => {
    const user = userEvent.setup();
    render(<LandingQuestionForm />);
    await user.type(screen.getByPlaceholderText(/اكتب سؤالك القانوني هنا/), 'إيجار قديم{Enter}');
    expect(mockPush).toHaveBeenCalledWith('/chat?q=' + encodeURIComponent('إيجار قديم'));
  });
});
