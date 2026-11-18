import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OfficePlaybookScreen } from './OfficePlaybookScreen';
import { clearAuthSession, setAuthSession } from '@/lib/auth';
import type { OfficePlaybookView } from '@/lib/office-playbook';

jest.mock('@/lib/api-client', () => {
  const actual = jest.requireActual('@/lib/api-client');
  return { ...actual, fetchOfficePlaybook: jest.fn(), saveOfficePlaybook: jest.fn(), resetOfficePlaybook: jest.fn() };
});
import { ApiError, fetchOfficePlaybook, resetOfficePlaybook, saveOfficePlaybook } from '@/lib/api-client';

const mGet = fetchOfficePlaybook as jest.MockedFunction<typeof fetchOfficePlaybook>;
const mSave = saveOfficePlaybook as jest.MockedFunction<typeof saveOfficePlaybook>;
const mReset = resetOfficePlaybook as jest.MockedFunction<typeof resetOfficePlaybook>;

const SESSION = { access_token: 'a', refresh_token: 'r', user: { id: 'u-1', email: 'u@example.com', full_name: null, role: 'user' as const, created_at: '2026-01-01T00:00:00.000Z' } };

const LIMITS = { maxCustomRules: 3, maxPhrasesPerRule: 10, maxPhraseLength: 80, minPhraseLength: 3, maxTitleLength: 120, maxTextLength: 600, maxDisabled: 200 };
const CATALOG = [
  { id: 'term_no_auto_renewal', title: 'تجديد العقد تلقائياً بدل مدة محددة', severity: 'عالٍ' as const, families: ['services', 'nda'], excludeFamilies: [], protects: null, absence: false },
  { id: 'economic_courts_forum', title: 'اقتراح: المحاكم الاقتصادية', severity: 'منخفض' as const, families: null, excludeFamilies: [], protects: null, absence: false },
];

function view(over: Partial<OfficePlaybookView> = {}): OfficePlaybookView {
  return { config: { disabledRules: [], severityOverrides: {}, customRules: [] }, version: 0, updatedAt: null, customized: false, catalog: CATALOG, limits: LIMITS, ...over };
}

describe('OfficePlaybookScreen', () => {
  beforeEach(() => {
    [mGet, mSave, mReset].forEach((m) => m.mockReset());
    clearAuthSession();
    window.sessionStorage.clear();
  });

  it('الزائر: دعوة لتسجيل الدخول ولا نداء للخادم', async () => {
    render(<OfficePlaybookScreen />);
    expect(await screen.findByText('تحتاج تسجيل الدخول أولاً')).toBeInTheDocument();
    expect(mGet).not.toHaveBeenCalled();
  });

  it('يعرض القواعد الافتراضية ورقم الإعداد، والحفظ معطل قبل أى تغيير', async () => {
    setAuthSession(SESSION);
    mGet.mockResolvedValue(view());
    render(<OfficePlaybookScreen />);
    expect(await screen.findByText('تجديد العقد تلقائياً بدل مدة محددة')).toBeInTheDocument();
    expect(screen.getByText(/لم تحفظ إعداداً بعد/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /حفظ قواعد المكتب/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /إعادة الضبط للافتراضى/ })).toBeDisabled();
  });

  it('تعطيل قاعدة وتغيير درجة أخرى ثم الحفظ يرسل الإعداد المتوقع', async () => {
    const user = userEvent.setup();
    setAuthSession(SESSION);
    mGet.mockResolvedValue(view());
    mSave.mockResolvedValue(view({ version: 1, customized: true, config: { disabledRules: ['term_no_auto_renewal'], severityOverrides: { economic_courts_forum: 'متوسط' }, customRules: [] } }));
    render(<OfficePlaybookScreen />);
    await user.click(await screen.findByLabelText('تفعيل: تجديد العقد تلقائياً بدل مدة محددة'));
    await user.selectOptions(screen.getByLabelText('درجة: اقتراح: المحاكم الاقتصادية'), 'متوسط');
    await user.click(screen.getByRole('button', { name: /حفظ قواعد المكتب/ }));
    await waitFor(() => expect(mSave).toHaveBeenCalledTimes(1));
    expect(mSave.mock.calls[0][0]).toEqual({ disabledRules: ['term_no_auto_renewal'], severityOverrides: { economic_courts_forum: 'متوسط' }, customRules: [] });
    expect(await screen.findByText(/حُفظت قواعد المكتب/)).toBeInTheDocument();
    expect(screen.getByText(/رقم الإعداد المحفوظ: 1/)).toBeInTheDocument();
  });

  it('قاعدة خاصة جديدة: تتحقق قبل الإرسال ثم تُرسل بلا معرّف مؤقت وبعبارات منظَّفة', async () => {
    const user = userEvent.setup();
    setAuthSession(SESSION);
    mGet.mockResolvedValue(view());
    mSave.mockResolvedValue(view({ version: 1, customized: true }));
    render(<OfficePlaybookScreen />);
    await user.click(await screen.findByRole('button', { name: /قاعدة جديدة/ }));
    await user.click(screen.getByRole('button', { name: /حفظ قواعد المكتب/ }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('العنوان مطلوب');
    expect(alert).toHaveTextContent('أضف عبارة واحدة على الأقل');
    expect(mSave).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('عنوان القاعدة 1'), 'لا غرامة تأخير');
    await user.type(screen.getByLabelText('عبارات القاعدة 1'), '  غرامة   تأخير {enter}{enter}شرط جزائى');
    await user.selectOptions(screen.getByLabelText('درجة القاعدة 1'), 'عالٍ');
    await user.click(screen.getByLabelText('عقد خدمات أو مقاولة أو توريد للقاعدة 1'));
    await user.click(screen.getByRole('button', { name: /حفظ قواعد المكتب/ }));
    await waitFor(() => expect(mSave).toHaveBeenCalledTimes(1));
    const sent = mSave.mock.calls[0][0].customRules[0];
    expect(sent).not.toHaveProperty('id');
    expect(sent).toMatchObject({ kind: 'forbidden_phrase', title: 'لا غرامة تأخير', phrases: ['غرامة تأخير', 'شرط جزائى'], severity: 'عالٍ', families: ['services'], enabled: true });
  });

  it('النوع «مطلوبة» والحذف: القاعدة المحذوفة لا تُرسل', async () => {
    const user = userEvent.setup();
    setAuthSession(SESSION);
    const existing = { id: 'c_1234abcd', kind: 'required_phrase' as const, title: 'القانون الواجب', phrases: ['القانون المصرى'], families: null, severity: 'متوسط' as const, explanation: '', suggestion: '', enabled: true };
    mGet.mockResolvedValue(view({ version: 2, customized: true, config: { disabledRules: [], severityOverrides: {}, customRules: [existing] } }));
    mSave.mockResolvedValue(view({ version: 3 }));
    render(<OfficePlaybookScreen />);
    const rule = await screen.findByRole('listitem', { name: 'قاعدة خاصة 1' });
    expect(within(rule).getByLabelText('نوع القاعدة 1')).toHaveValue('required_phrase');
    expect(within(rule).getByLabelText('عبارات القاعدة 1')).toHaveValue('القانون المصرى');
    await user.click(within(rule).getByRole('button', { name: /حذف القاعدة الخاصة 1/ }));
    await user.click(screen.getByRole('button', { name: /حفظ قواعد المكتب/ }));
    await waitFor(() => expect(mSave).toHaveBeenCalled());
    expect(mSave.mock.calls[0][0].customRules).toEqual([]);
  });

  it('رفض الخادم (400) يعرض رسائله، ويبقى ما كتبه المستخدم', async () => {
    const user = userEvent.setup();
    setAuthSession(SESSION);
    mGet.mockResolvedValue(view());
    mSave.mockRejectedValue(new ApiError(400, 'قاعدة غير معروفة للتعطيل: x\nأخرى'));
    render(<OfficePlaybookScreen />);
    await user.click(await screen.findByLabelText('تفعيل: تجديد العقد تلقائياً بدل مدة محددة'));
    await user.click(screen.getByRole('button', { name: /حفظ قواعد المكتب/ }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('قاعدة غير معروفة للتعطيل: x');
    expect(alert).toHaveTextContent('أخرى');
    expect(screen.getByLabelText('تفعيل: تجديد العقد تلقائياً بدل مدة محددة')).not.toBeChecked();
  });

  it('إعادة الضبط تطلب تأكيداً ثم تنفذ', async () => {
    const user = userEvent.setup();
    setAuthSession(SESSION);
    mGet.mockResolvedValue(view({ version: 2, customized: true, config: { disabledRules: ['term_no_auto_renewal'], severityOverrides: {}, customRules: [] } }));
    mReset.mockResolvedValue(view());
    render(<OfficePlaybookScreen />);
    await user.click(await screen.findByRole('button', { name: /إعادة الضبط للافتراضى/ }));
    expect(mReset).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'نعم، أعد الضبط' }));
    await waitFor(() => expect(mReset).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('أُعيدت القواعد الافتراضية.')).toBeInTheDocument();
    expect(screen.getByLabelText('تفعيل: تجديد العقد تلقائياً بدل مدة محددة')).toBeChecked();
  });

  it('فشل التحميل يعرض الخطأ بدل شاشة فارغة', async () => {
    setAuthSession(SESSION);
    mGet.mockRejectedValue(new ApiError(500, 'تعذّر جلب قواعد المكتب (HTTP 500).'));
    render(<OfficePlaybookScreen />);
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر جلب قواعد المكتب');
  });

  it('زر إضافة قاعدة يتعطل عند الحد الأقصى', async () => {
    const user = userEvent.setup();
    setAuthSession(SESSION);
    mGet.mockResolvedValue(view());
    render(<OfficePlaybookScreen />);
    const add = await screen.findByRole('button', { name: /قاعدة جديدة/ });
    for (let i = 0; i < LIMITS.maxCustomRules; i++) await user.click(add);
    expect(add).toBeDisabled();
  });
});
