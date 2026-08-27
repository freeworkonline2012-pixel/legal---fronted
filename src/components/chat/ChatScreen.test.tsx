import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatScreen } from './ChatScreen';
import { ToastProvider } from '@/components/ui/Toast';
import { DEMO_ANSWER, DEMO_REFUSAL } from '@/lib/demo-data';

jest.mock('@/lib/api-client', () => ({
  fetchHealth: jest.fn(),
  postQuestion: jest.fn(),
  fetchQuestionHistory: jest.fn(),
  postFeedback: jest.fn(),
}));

import { postQuestion } from '@/lib/api-client';

const mockedPostQuestion = postQuestion as jest.MockedFunction<typeof postQuestion>;

function renderScreen(initialQuestion = '') {
  return render(
    <ToastProvider>
      <ChatScreen initialQuestion={initialQuestion} />
    </ToastProvider>,
  );
}

describe('ChatScreen', () => {
  beforeEach(() => {
    mockedPostQuestion.mockReset();
  });

  it('يعرض الترحيب والأسئلة المقترحة في الحالة الفارغة', () => {
    renderScreen();
    expect(screen.getByText(/أهلاً بك/)).toBeInTheDocument();
    expect(screen.getByText('اتنفصلت من الشغل من غير إشعار، ليا حق تعويض؟')).toBeInTheDocument();
  });

  it('يعرض فقاعة السؤال ثم الإجابة الموثّقة عند نجاح الطلب', async () => {
    const user = userEvent.setup();
    mockedPostQuestion.mockResolvedValue(DEMO_ANSWER);
    renderScreen();

    const textarea = screen.getByLabelText(/اسأل عن حقك القانوني/);
    await user.type(textarea, 'اتنفصلت من الشغل من غير إشعار، ليا حق تعويض؟');
    await user.click(screen.getByRole('button', { name: 'إرسال السؤال' }));

    // فقاعة السؤال تظهر فوراً
    expect(screen.getByText('اتنفصلت من الشغل من غير إشعار، ليا حق تعويض؟')).toBeInTheDocument();

    // الإجابة الموثّقة تظهر بعد اكتمال الطلب
    await waitFor(() => {
      expect(screen.getByText(DEMO_ANSWER.answer)).toBeInTheDocument();
    });
    expect(screen.getAllByText(/المادة 110/).length).toBeGreaterThan(0);
    expect(mockedPostQuestion).toHaveBeenCalledWith({
      question: 'اتنفصلت من الشغل من غير إشعار، ليا حق تعويض؟',
      conversation_id: undefined,
    });
  }, 15000);

  it('يعرض حالة الرفض (RefusalCard) عند استجابة refused', async () => {
    const user = userEvent.setup();
    mockedPostQuestion.mockResolvedValue(DEMO_REFUSAL);
    renderScreen();

    await user.type(screen.getByLabelText(/اسأل عن حقك القانوني/), 'إيه حكم شركة السوشيال ميديا؟');
    await user.click(screen.getByRole('button', { name: 'إرسال السؤال' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /أعد صياغة السؤال/ })).toBeInTheDocument();
    });
  });

  it('يعرض رسالة خطأ قابلة للتعافي عند فشل الاتصال بالخادم', async () => {
    const user = userEvent.setup();
    mockedPostQuestion.mockRejectedValue(new Error('network down'));
    renderScreen();

    await user.type(screen.getByLabelText(/اسأل عن حقك القانوني/), 'سؤال عن الإيجار القديم');
    await user.click(screen.getByRole('button', { name: 'إرسال السؤال' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /إعادة المحاولة/ })).toBeInTheDocument();
    });
    // رسالة الخطأ تظهر داخل الفقاعة (role=alert) وقد تظهر أيضاً كـ Toast
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    expect(screen.getByText(/تعذّر الاتصال بخدمة الإجابة/)).toBeInTheDocument();
  });

  it('«إعادة المحاولة» تُعيد إرسال آخر سؤال فاشل فعلياً', async () => {
    const user = userEvent.setup();
    mockedPostQuestion
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(DEMO_ANSWER);
    renderScreen();

    await user.type(screen.getByLabelText(/اسأل عن حقك القانوني/), 'سؤال عن الإيجار القديم');
    await user.click(screen.getByRole('button', { name: 'إرسال السؤال' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /إعادة المحاولة/ })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /إعادة المحاولة/ }));

    // يُعاد إرسال السؤال نفسه (الطلب الثاني) وتظهر الإجابة الموثّقة
    await waitFor(() => {
      expect(mockedPostQuestion).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.getByText(DEMO_ANSWER.answer)).toBeInTheDocument();
    });
    // فقاعة الخطأ السابقة أُزيلت — لا تكدس للرسائل
    expect(screen.queryByText(/تعذّر الاتصال بخدمة الإجابة/)).not.toBeInTheDocument();
  });

  it('يزيل فقاعة الخطأ القديمة عند إرسال سؤال جديد (لا بقاء لزر «إعادة المحاولة» قديم)', async () => {
    const user = userEvent.setup();
    mockedPostQuestion
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(DEMO_ANSWER);
    renderScreen();

    // سؤال أول يفشل الاتصال فيه
    await user.type(screen.getByLabelText(/اسأل عن حقك القانوني/), 'سؤال أول فاشل');
    await user.click(screen.getByRole('button', { name: 'إرسال السؤال' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /إعادة المحاولة/ })).toBeInTheDocument();
    });

    // سؤال جديد ناجح — يجب أن تختفي فقاعة الخطأ القديمة من الخيط
    await user.type(screen.getByLabelText(/اسأل عن حقك القانوني/), 'سؤال ثانٍ ناجح');
    await user.click(screen.getByRole('button', { name: 'إرسال السؤال' }));

    await waitFor(() => {
      expect(screen.getByText(DEMO_ANSWER.answer)).toBeInTheDocument();
    });
    expect(screen.queryByText(/تعذّر الاتصال بخدمة الإجابة/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /إعادة المحاولة/ })).not.toBeInTheDocument();
  });

  it('يملأ الحقل من سؤال مبدئي (initialQuestion)', () => {
    renderScreen('سؤال مبدئي من صفحة الهبوط');
    expect(screen.getByLabelText(/اسأل عن حقك القانوني/)).toHaveValue('سؤال مبدئي من صفحة الهبوط');
  });
});
