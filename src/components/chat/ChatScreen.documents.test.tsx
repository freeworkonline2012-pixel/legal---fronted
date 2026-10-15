import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatScreen } from './ChatScreen';
import { ToastProvider } from '@/components/ui/Toast';
import { DEMO_ANSWER } from '@/lib/demo-data';
import { clearAuthSession, setAuthSession } from '@/lib/auth';

jest.mock('@/lib/api-client', () => ({
  fetchHealth: jest.fn(),
  postQuestion: jest.fn(),
  fetchQuestionHistory: jest.fn(),
  postFeedback: jest.fn(),
  analyzeDocument: jest.fn(),
  fetchCountries: jest.fn().mockResolvedValue({ items: [] }),
  fetchLaws: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  ApiError: class ApiError extends Error {},
}));
import { analyzeDocument, postQuestion } from '@/lib/api-client';

const mockedPost = postQuestion as jest.MockedFunction<typeof postQuestion>;
const mockedAnalyze = analyzeDocument as jest.MockedFunction<typeof analyzeDocument>;

describe('ChatScreen — إرفاق مستند', () => {
  beforeEach(() => {
    mockedPost.mockReset();
    mockedAnalyze.mockReset();
    clearAuthSession();
    setAuthSession({
      access_token: 'tok',
      refresh_token: 'r',
      user: { id: 'u', email: 'u@e.com', full_name: null, role: 'user', created_at: '2026-01-01T00:00:00.000Z' },
    });
  });

  it('الوقائع المعتمدة تُرسل مع السؤال كإجابات استيضاح (جولة 0) وتظهر ملاحظة على الفقاعة', async () => {
    mockedPost.mockResolvedValue(DEMO_ANSWER);
    mockedAnalyze.mockResolvedValue({
      doc_type: 'عقد عمل',
      facts: [{ label: 'الأجر الشهرى', value: '5000 جنيه', quote: 'الأجر الشهرى 5000 جنيه' }],
      redactions: {},
      redactions_total: 0,
      truncated: false,
      ocr: false,
      warnings: [],
    });
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ChatScreen />
      </ToastProvider>,
    );

    await user.type(screen.getByLabelText(/اسأل عن حقك القانوني/), 'فُصلت من عملى، ما حقوقى؟');
    await user.click(await screen.findByRole('button', { name: /أرفق مستنداً/ }));
    await user.upload(screen.getByLabelText(/الملف/), new File([new Uint8Array([1])], 'c.pdf'));
    await user.click(screen.getByRole('checkbox', { name: /أوافق/ }));
    await user.click(screen.getByRole('button', { name: 'حلّل المستند' }));
    await user.click(await screen.findByRole('button', { name: /اعتمد الوقائع المحددة/ }));
    await user.click(screen.getByRole('button', { name: 'إرسال السؤال' }));

    await waitFor(() => expect(mockedPost).toHaveBeenCalledTimes(1));
    expect(mockedPost).toHaveBeenCalledWith({
      question: 'فُصلت من عملى، ما حقوقى؟',
      conversation_id: undefined,
      clarification: {
        round: 0,
        answers: [{ question: 'الأجر الشهرى (من المستند)', answer: '5000 جنيه', kind: 'custom' }],
      },
    });
    expect(await screen.findByText(/أُرفق مستند \(عقد عمل\) — 1 وقائع معتمدة/)).toBeInTheDocument();
    // الإرفاق يُصفَّر بعد الإرسال: السؤال التالى بلا وقائع
    expect(screen.queryByTestId('document-attached')).toBeNull();
  }, 20000);

  it('بلا مستند: الطلب كما كان تماماً (بلا clarification)', async () => {
    mockedPost.mockResolvedValue(DEMO_ANSWER);
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ChatScreen />
      </ToastProvider>,
    );
    await user.type(screen.getByLabelText(/اسأل عن حقك القانوني/), 'سؤال عادى بدون مستند');
    await user.click(screen.getByRole('button', { name: 'إرسال السؤال' }));
    await waitFor(() => expect(mockedPost).toHaveBeenCalledWith({ question: 'سؤال عادى بدون مستند', conversation_id: undefined }));
  }, 15000);
});
