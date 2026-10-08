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
  // MainSidebar (تُعرَض داخل ChatScreen) تستدعيهما عند التركيب — بلا هذا
  // الـmock تفشل بـ "is not a function" رغم أن الاختبارات هنا لا تخص الشريط
  // الجانبى. القيم الفارغة كافية: لا دول = لا شجرة تصفح، لا يؤثر على الاختبارات.
  fetchCountries: jest.fn().mockResolvedValue({ items: [] }),
  fetchLaws: jest.fn().mockResolvedValue({ items: [], total: 0 }),
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

  describe('الاستيضاح', () => {
    const CLAR_RESPONSE = {
      id: '',
      answer: 'لأجيبك بدقة أحتاج إلى بعض التوضيحات',
      citations: [],
      refused: false,
      clarification: {
        round: 1,
        max_rounds: 2,
        questions: [
          { id: 'q1', question: 'ما نوع عقد العمل؟', options: ['محدد المدة', 'غير محدد المدة'], allow_multiple: false },
        ],
      },
    };
    const ROUND2 = {
      ...CLAR_RESPONSE,
      clarification: {
        round: 2,
        max_rounds: 2,
        questions: [{ id: 'q1', question: 'من الذى أنهى العلاقة؟', options: ['صاحب العمل', 'العامل'], allow_multiple: false }],
      },
    };

    async function ask(user: ReturnType<typeof userEvent.setup>, text: string) {
      await user.type(screen.getByLabelText(/اسأل عن حقك القانوني/), text);
      await user.click(screen.getByRole('button', { name: 'إرسال السؤال' }));
    }

    it('يعرض بطاقة الاستيضاح بدل الإجابة، ثم يرسل الإجابات مع السؤال الأصلى ويعرض الإجابة', async () => {
      const user = userEvent.setup();
      mockedPostQuestion.mockResolvedValueOnce(CLAR_RESPONSE).mockResolvedValueOnce(DEMO_ANSWER);
      renderScreen();
      await ask(user, 'ما حقوقى عند الفصل؟');

      await waitFor(() => expect(screen.getByText(/1\. ما نوع عقد العمل؟/)).toBeInTheDocument());
      expect(mockedPostQuestion).toHaveBeenNthCalledWith(1, { question: 'ما حقوقى عند الفصل؟', conversation_id: undefined });

      await user.click(screen.getByLabelText('محدد المدة'));
      await user.click(screen.getByRole('button', { name: 'إرسال الإجابات' }));

      await waitFor(() => expect(screen.getByText(DEMO_ANSWER.answer)).toBeInTheDocument());
      expect(mockedPostQuestion).toHaveBeenNthCalledWith(2, {
        question: 'ما حقوقى عند الفصل؟',
        conversation_id: undefined,
        clarification: { round: 1, answers: [{ question: 'ما نوع عقد العمل؟', answer: 'محدد المدة', kind: 'option' }] },
      });
      // البطاقة صارت ملخصاً للقراءة فقط
      expect(screen.getByTestId('clarification-resolved')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'إرسال الإجابات' })).not.toBeInTheDocument();
    });

    it('جولة ثانية: الإجابات تتراكم عبر الجولات', async () => {
      const user = userEvent.setup();
      mockedPostQuestion
        .mockResolvedValueOnce(CLAR_RESPONSE)
        .mockResolvedValueOnce(ROUND2)
        .mockResolvedValueOnce(DEMO_ANSWER);
      renderScreen();
      await ask(user, 'ما حقوقى عند الفصل؟');
      await waitFor(() => expect(screen.getByText(/1\. ما نوع عقد العمل؟/)).toBeInTheDocument());
      await user.click(screen.getByLabelText('محدد المدة'));
      await user.click(screen.getByRole('button', { name: 'إرسال الإجابات' }));

      await waitFor(() => expect(screen.getByText(/1\. من الذى أنهى العلاقة؟/)).toBeInTheDocument());
      await user.click(screen.getByLabelText('لا أعرف'));
      await user.click(screen.getByRole('button', { name: 'إرسال الإجابات' }));

      await waitFor(() => expect(screen.getByText(DEMO_ANSWER.answer)).toBeInTheDocument());
      expect(mockedPostQuestion).toHaveBeenNthCalledWith(3, {
        question: 'ما حقوقى عند الفصل؟',
        conversation_id: undefined,
        clarification: {
          round: 2,
          answers: [
            { question: 'ما نوع عقد العمل؟', answer: 'محدد المدة', kind: 'option' },
            { question: 'من الذى أنهى العلاقة؟', answer: '', kind: 'unknown' },
          ],
        },
      });
    });

    it('«تخطَّ وأجبنى مباشرة» يرسل skip=true مع الإجابات حتى الآن', async () => {
      const user = userEvent.setup();
      mockedPostQuestion.mockResolvedValueOnce(CLAR_RESPONSE).mockResolvedValueOnce(DEMO_ANSWER);
      renderScreen();
      await ask(user, 'ما حقوقى عند الفصل؟');
      await waitFor(() => expect(screen.getByRole('button', { name: /تخطَّ وأجبنى مباشرة/ })).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /تخطَّ وأجبنى مباشرة/ }));
      await waitFor(() => expect(screen.getByText(DEMO_ANSWER.answer)).toBeInTheDocument());
      expect(mockedPostQuestion).toHaveBeenNthCalledWith(2, {
        question: 'ما حقوقى عند الفصل؟',
        conversation_id: undefined,
        clarification: { round: 1, skip: true, answers: [] },
      });
    });

    it('سؤال جديد بدل الإجابة عن الاستيضاح يُبطل البطاقة المعلّقة ويبدأ من الصفر', async () => {
      const user = userEvent.setup();
      mockedPostQuestion.mockResolvedValueOnce(CLAR_RESPONSE).mockResolvedValueOnce(DEMO_ANSWER);
      renderScreen();
      await ask(user, 'ما حقوقى عند الفصل؟');
      await waitFor(() => expect(screen.getByRole('button', { name: 'إرسال الإجابات' })).toBeInTheDocument());
      await ask(user, 'سؤال مختلف تماماً');
      await waitFor(() => expect(screen.getByText(DEMO_ANSWER.answer)).toBeInTheDocument());
      expect(screen.getByText(/انتقلت إلى سؤال جديد/)).toBeInTheDocument();
      expect(mockedPostQuestion).toHaveBeenNthCalledWith(2, { question: 'سؤال مختلف تماماً', conversation_id: undefined });
    });

    it('فشل الشبكة بعد إجابات الاستيضاح: «إعادة المحاولة» تعيد نفس الطلب بسياقه ولا تكرر فقاعة السؤال', async () => {
      const user = userEvent.setup();
      mockedPostQuestion
        .mockResolvedValueOnce(CLAR_RESPONSE)
        .mockRejectedValueOnce(new Error('down'))
        .mockResolvedValueOnce(DEMO_ANSWER);
      renderScreen();
      await ask(user, 'ما حقوقى عند الفصل؟');
      await waitFor(() => expect(screen.getByLabelText('محدد المدة')).toBeInTheDocument());
      await user.click(screen.getByLabelText('محدد المدة'));
      await user.click(screen.getByRole('button', { name: 'إرسال الإجابات' }));
      await waitFor(() => expect(screen.getByRole('button', { name: /إعادة المحاولة/ })).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /إعادة المحاولة/ }));
      await waitFor(() => expect(screen.getByText(DEMO_ANSWER.answer)).toBeInTheDocument());
      expect(mockedPostQuestion).toHaveBeenNthCalledWith(3, mockedPostQuestion.mock.calls[1][0]);
      expect(screen.getAllByText('ما حقوقى عند الفصل؟')).toHaveLength(1);
    });
  });
});
