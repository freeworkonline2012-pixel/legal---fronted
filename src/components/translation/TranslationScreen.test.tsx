import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TranslationScreen } from './TranslationScreen';
import { clearAuthSession, setAuthSession } from '@/lib/auth';
import { ACTIVE_TRANSLATION_KEY } from '@/lib/translation';
import type { TranslationJob } from '@/lib/types';

jest.mock('@/lib/api-client', () => {
  const actual = jest.requireActual('@/lib/api-client');
  return {
    ...actual,
    createTranslation: jest.fn(),
    stepTranslation: jest.fn(),
    fetchTranslation: jest.fn(),
    fetchTranslationUnits: jest.fn(),
    editTranslationUnit: jest.fn(),
    deleteTranslation: jest.fn(),
    downloadTranslation: jest.fn(),
    fetchMyTranslations: jest.fn(),
    runTranslationInBackground: jest.fn(),
  };
});

import {
  ApiError,
  createTranslation,
  deleteTranslation,
  downloadTranslation,
  editTranslationUnit,
  fetchMyTranslations,
  fetchTranslation,
  fetchTranslationUnits,
  runTranslationInBackground,
  stepTranslation,
} from '@/lib/api-client';

const mCreate = createTranslation as jest.MockedFunction<typeof createTranslation>;
const mStep = stepTranslation as jest.MockedFunction<typeof stepTranslation>;
const mFetch = fetchTranslation as jest.MockedFunction<typeof fetchTranslation>;
const mUnits = fetchTranslationUnits as jest.MockedFunction<typeof fetchTranslationUnits>;
const mEdit = editTranslationUnit as jest.MockedFunction<typeof editTranslationUnit>;
const mDelete = deleteTranslation as jest.MockedFunction<typeof deleteTranslation>;
const mDownload = downloadTranslation as jest.MockedFunction<typeof downloadTranslation>;
const mMine = fetchMyTranslations as jest.MockedFunction<typeof fetchMyTranslations>;
const mRun = runTranslationInBackground as jest.MockedFunction<typeof runTranslationInBackground>;

const SESSION = {
  access_token: 'a',
  refresh_token: 'r',
  user: { id: 'u-1', email: 'u@example.com', full_name: null, role: 'user' as const, created_at: '2026-01-01T00:00:00.000Z' },
};

function job(over: Partial<TranslationJob> = {}): TranslationJob {
  return {
    id: 't-1',
    status: 'ready',
    source_lang: 'ar',
    target_lang: 'en',
    title: 'عقد-العمل',
    contract_type: 'عقد عمل',
    detection: { lang: 'ar', dominant_share: 0.99 },
    progress: { done_units: 0, total_units: 10, done_batches: 0, total_batches: 2 },
    warnings: [],
    flagged: [],
    notes: [],
    expires_at: '2026-10-17T10:00:00.000Z',
    created_at: '2026-10-15T10:00:00.000Z',
    ...over,
  };
}

const DONE = job({
  status: 'completed',
  progress: { done_units: 10, total_units: 10, done_batches: 2, total_batches: 2 },
  flagged: [{ n: 3, flags: ['numbers_mismatch'], src: 'الأجر 12000 جنيه', tgt: 'The wage is 21000 EGP' }],
  notes: [{ n: 4, term: 'الشرط الجزائى', note: 'لا مقابل مطابق تماماً بين النظامين.' }],
});

const DOCX = new File(['x'], 'contract.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

async function startFlow(user: ReturnType<typeof userEvent.setup>) {
  await user.upload(await screen.findByLabelText(/ملف العقد/), DOCX);
  await user.click(screen.getByRole('checkbox'));
  await user.click(screen.getByRole('button', { name: 'ابدأ الترجمة' }));
}

describe('TranslationScreen', () => {
  beforeEach(() => {
    [mCreate, mStep, mFetch, mUnits, mEdit, mDelete, mDownload, mMine, mRun].forEach((m) => m.mockReset());
    mMine.mockResolvedValue([]);
    // الافتراضى: لا مشغِّل خلفية متاح => تقود الواجهة الخطوات كما كان (يُجرَّب الاستئناف أولاً ثم يسقط للخطوات)
    mRun.mockRejectedValue(new ApiError(429, 'ممتلئ'));
    clearAuthSession();
    window.sessionStorage.clear();
  });

  it('يعرض دعوة لتسجيل الدخول للزائر بدل النموذج', async () => {
    render(<TranslationScreen />);
    expect(await screen.findByText('تحتاج تسجيل الدخول أولاً')).toBeInTheDocument();
    expect(screen.queryByLabelText(/ملف العقد/)).not.toBeInTheDocument();
  });

  it('يعرض إفصاح الخصوصية ويعطل البدء قبل الملف والموافقة، بلا مربع تنبيه المسودة العلوى', async () => {
    setAuthSession(SESSION);
    render(<TranslationScreen />);
    expect((await screen.findAllByText(/بما فيه الأسماء والعناوين/)).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    expect(screen.queryByText(/مسودة ترجمة تحتاج مراجعة/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ابدأ الترجمة' })).toBeDisabled();
  });

  it('يرفض نوع ملف غير مدعوم دون استدعاء الخادم', async () => {
    setAuthSession(SESSION);
    const user = userEvent.setup({ applyAccept: false });
    render(<TranslationScreen />);
    await user.upload(await screen.findByLabelText(/ملف العقد/), new File(['x'], 'a.exe'));
    expect(await screen.findByRole('alert')).toHaveTextContent('غير مدعوم');
    expect(screen.getByRole('button', { name: 'ابدأ الترجمة' })).toBeDisabled();
    expect(mCreate).not.toHaveBeenCalled();
  });

  it('تدفق كامل: إنشاء ← خطوات ← اكتمال مع بنود موسومة وملاحظات وتنزيل', async () => {
    setAuthSession(SESSION);
    const user = userEvent.setup();
    mCreate.mockResolvedValue(job());
    mStep
      .mockResolvedValueOnce(job({ status: 'translating', progress: { done_units: 5, total_units: 10, done_batches: 1, total_batches: 2 } }))
      .mockResolvedValueOnce(DONE);
    render(<TranslationScreen />);
    await startFlow(user);

    expect(mCreate).toHaveBeenCalledWith(DOCX, 'en', true, true);
    expect(await screen.findByLabelText('الترجمة جاهزة')).toBeInTheDocument();
    expect(mStep).toHaveBeenCalledTimes(2);
    expect(window.sessionStorage.getItem(ACTIVE_TRANSLATION_KEY)).toBe('t-1');

    const flagged = screen.getByLabelText('بنود تحتاج مراجعتك');
    expect(within(flagged).getByText(/الأرقام أو المبالغ/)).toBeInTheDocument();
    expect(screen.getByText(/الشرط الجزائى/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /تنزيل Word/ }));
    expect(mDownload).toHaveBeenCalledWith('t-1', 'docx', 'translation');
    await user.click(screen.getByLabelText(/ثنائى اللغة/));
    await user.click(screen.getByRole('button', { name: /تنزيل PDF/ }));
    expect(mDownload).toHaveBeenLastCalledWith('t-1', 'pdf', 'bilingual');
  });

  it('يرسل لغة الهدف المختارة', async () => {
    setAuthSession(SESSION);
    const user = userEvent.setup();
    mCreate.mockResolvedValue(job({ source_lang: 'en', target_lang: 'ar' }));
    mStep.mockResolvedValue({ ...DONE, source_lang: 'en', target_lang: 'ar' });
    render(<TranslationScreen />);
    await user.selectOptions(await screen.findByLabelText('الترجمة إلى'), 'ar');
    await startFlow(user);
    expect(mCreate).toHaveBeenCalledWith(DOCX, 'ar', true, true);
  });

  it('خطأ الإنشاء (422) يُعرض ويبقى النموذج', async () => {
    setAuthSession(SESSION);
    const user = userEvent.setup();
    mCreate.mockRejectedValue(new ApiError(422, 'العقد مكتوب أصلاً بالإنجليزية — اختر لغة الترجمة المقابلة.'));
    render(<TranslationScreen />);
    await startFlow(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('مكتوب أصلاً بالإنجليزية');
    expect(screen.getByRole('button', { name: 'ابدأ الترجمة' })).toBeInTheDocument();
    expect(mStep).not.toHaveBeenCalled();
  });

  it('فشل خطوة (502) يوقف مع زر إعادة المحاولة ثم يكمل', async () => {
    setAuthSession(SESSION);
    const user = userEvent.setup();
    mCreate.mockResolvedValue(job());
    mStep
      .mockRejectedValueOnce(new ApiError(502, 'تعذّرت الترجمة الآن — لا يضيع ما أُنجز، أعد المحاولة بعد لحظات.'))
      .mockResolvedValueOnce(DONE);
    render(<TranslationScreen />);
    await startFlow(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('لا يضيع ما أُنجز');
    await user.click(screen.getByRole('button', { name: /أعد المحاولة/ }));
    expect(await screen.findByLabelText('الترجمة جاهزة')).toBeInTheDocument();
  });

  it('يستأنف مهمة محفوظة بعد التحديث (مكتملة) ويعرض نتيجتها', async () => {
    setAuthSession(SESSION);
    window.sessionStorage.setItem(ACTIVE_TRANSLATION_KEY, 't-1');
    mFetch.mockResolvedValue(DONE);
    render(<TranslationScreen />);
    expect(await screen.findByLabelText('الترجمة جاهزة')).toBeInTheDocument();
  });

  it('يستأنف مهمة غير مكتملة بزر «تابع الترجمة» لا تلقائياً', async () => {
    setAuthSession(SESSION);
    window.sessionStorage.setItem(ACTIVE_TRANSLATION_KEY, 't-1');
    mFetch.mockResolvedValue(job({ status: 'translating', progress: { done_units: 5, total_units: 10, done_batches: 1, total_batches: 2 } }));
    mStep.mockResolvedValue(DONE);
    const user = userEvent.setup();
    render(<TranslationScreen />);
    const cont = await screen.findByRole('button', { name: /تابع الترجمة/ });
    expect(mStep).not.toHaveBeenCalled();
    await user.click(cont);
    expect(await screen.findByLabelText('الترجمة جاهزة')).toBeInTheDocument();
  });

  it('معرّف محفوظ لمهمة منتهية (فشل الجلب) يُنسى ويبقى النموذج', async () => {
    setAuthSession(SESSION);
    window.sessionStorage.setItem(ACTIVE_TRANSLATION_KEY, 'gone');
    mFetch.mockRejectedValue(new ApiError(404, 'x'));
    render(<TranslationScreen />);
    expect(await screen.findByRole('button', { name: 'ابدأ الترجمة' })).toBeInTheDocument();
    await waitFor(() => expect(window.sessionStorage.getItem(ACTIVE_TRANSLATION_KEY)).toBeNull());
  });

  it('تصحيح بند موسوم: يجلب النص الكامل ثم يحفظ ويحدّث الحالة', async () => {
    setAuthSession(SESSION);
    window.sessionStorage.setItem(ACTIVE_TRANSLATION_KEY, 't-1');
    mFetch.mockResolvedValueOnce(DONE).mockResolvedValueOnce({ ...DONE, flagged: [] });
    mUnits.mockResolvedValue({
      total: 10,
      offset: 2,
      items: [{ n: 3, src: 'الأجر 12000 جنيه', tgt: 'The wage is 21000 EGP (full)', flags: ['numbers_mismatch'], cont: false, edited: false }],
    });
    mEdit.mockResolvedValue({ n: 3, src: 'الأجر 12000 جنيه', tgt: 'The wage is 12000 EGP', flags: [], cont: false, edited: true });
    const user = userEvent.setup();
    render(<TranslationScreen />);
    await user.click(await screen.findByRole('button', { name: 'راجع وعدّل' }));
    expect(mUnits).toHaveBeenCalledWith('t-1', 2, 1);
    const area = await screen.findByLabelText('عدّل الترجمة');
    expect(area).toHaveValue('The wage is 21000 EGP (full)');
    await user.clear(area);
    await user.type(area, 'The wage is 12000 EGP');
    await user.click(screen.getByRole('button', { name: 'احفظ التعديل' }));
    expect(mEdit).toHaveBeenCalledWith('t-1', 3, 'The wage is 12000 EGP');
    await waitFor(() => expect(screen.queryByLabelText('بنود تحتاج مراجعتك')).not.toBeInTheDocument());
  });

  it('الحذف الفورى يطلب تأكيداً ثم يعود للنموذج وينسى المعرّف', async () => {
    setAuthSession(SESSION);
    window.sessionStorage.setItem(ACTIVE_TRANSLATION_KEY, 't-1');
    mFetch.mockResolvedValue(DONE);
    mDelete.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<TranslationScreen />);
    await user.click(await screen.findByRole('button', { name: 'احذف الآن' }));
    expect(mDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /نعم، احذف/ }));
    expect(mDelete).toHaveBeenCalledWith('t-1');
    expect(await screen.findByRole('button', { name: 'ابدأ الترجمة' })).toBeInTheDocument();
    expect(window.sessionStorage.getItem(ACTIVE_TRANSLATION_KEY)).toBeNull();
  });

  it('معاينة الفقرات تُحمَّل عند الطلب فقط', async () => {
    setAuthSession(SESSION);
    window.sessionStorage.setItem(ACTIVE_TRANSLATION_KEY, 't-1');
    mFetch.mockResolvedValue({ ...DONE, flagged: [] });
    mUnits.mockResolvedValue({
      total: 1,
      offset: 0,
      items: [{ n: 1, src: 'عقد عمل', tgt: 'Employment Contract', flags: [], cont: false, edited: false }],
    });
    const user = userEvent.setup();
    render(<TranslationScreen />);
    await screen.findByLabelText('الترجمة جاهزة');
    expect(mUnits).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'عرض المعاينة' }));
    expect(await screen.findByText('Employment Contract')).toBeInTheDocument();
  });

  describe('تشغيل الخلفية (الخادم يكمل الترجمة)', () => {
    const RUNNING = (done: number) =>
      job({ status: 'translating', background: 'running', progress: { done_units: done, total_units: 10, done_batches: 1, total_batches: 2 } });

    it('الخادم يكمل: الواجهة تتابع بالجلب فقط ولا تستدعى step أبداً', async () => {
      setAuthSession(SESSION);
      const user = userEvent.setup();
      mCreate.mockResolvedValue(job({ background: 'running' }));
      mFetch.mockResolvedValueOnce(RUNNING(5)).mockResolvedValueOnce({ ...DONE, background: 'idle' });
      render(<TranslationScreen pollMs={5} />);
      await startFlow(user);
      expect(await screen.findByLabelText('الترجمة جاهزة')).toBeInTheDocument();
      expect(mStep).not.toHaveBeenCalled();
      expect(mFetch).toHaveBeenCalledTimes(2);
    });

    it('أثناء الجريان يخبر المستخدم أنه يستطيع إغلاق الصفحة والعودة من «ترجماتى»', async () => {
      setAuthSession(SESSION);
      const user = userEvent.setup();
      mCreate.mockResolvedValue(job({ background: 'running' }));
      mFetch.mockResolvedValue(RUNNING(5));
      render(<TranslationScreen pollMs={5} />);
      await startFlow(user);
      expect(await screen.findByText(/يمكنك إغلاق هذه الصفحة والعودة لاحقاً/)).toBeInTheDocument();
    });

    it('توقف المشغِّل قبل الاكتمال: «أعد المحاولة»، والضغط يطلب الخلفية من جديد ثم يكمل', async () => {
      setAuthSession(SESSION);
      const user = userEvent.setup();
      mCreate.mockResolvedValue(job({ background: 'running' }));
      mFetch
        .mockResolvedValueOnce(job({ status: 'translating', background: 'idle', progress: { done_units: 5, total_units: 10, done_batches: 1, total_batches: 2 } }))
        .mockResolvedValueOnce({ ...DONE, background: 'idle' });
      mRun.mockReset();
      mRun.mockResolvedValue(RUNNING(5));
      render(<TranslationScreen pollMs={5} />);
      await startFlow(user);
      expect(await screen.findByRole('alert')).toHaveTextContent('توقفت الترجمة فى الخلفية');
      await user.click(screen.getByRole('button', { name: /أعد المحاولة/ }));
      expect(await screen.findByLabelText('الترجمة جاهزة')).toBeInTheDocument();
      expect(mRun).toHaveBeenCalledWith('t-1');
      expect(mStep).not.toHaveBeenCalled();
    });

    it('طابور الخلفية ممتلئ (429) عند الاستئناف: تكمل الواجهة الخطوات بنفسها', async () => {
      setAuthSession(SESSION);
      window.sessionStorage.setItem(ACTIVE_TRANSLATION_KEY, 't-1');
      mFetch.mockResolvedValue(job({ status: 'translating', background: 'idle', progress: { done_units: 5, total_units: 10, done_batches: 1, total_batches: 2 } }));
      mStep.mockResolvedValue(DONE);
      const user = userEvent.setup();
      render(<TranslationScreen pollMs={5} />);
      await user.click(await screen.findByRole('button', { name: /تابع الترجمة/ }));
      expect(await screen.findByLabelText('الترجمة جاهزة')).toBeInTheDocument();
      expect(mRun).toHaveBeenCalledWith('t-1');
      expect(mStep).toHaveBeenCalledTimes(1);
    });

    it('خادم قديم (بلا حقل background): السلوك القديم، الواجهة تقود الخطوات', async () => {
      setAuthSession(SESSION);
      const user = userEvent.setup();
      mCreate.mockResolvedValue(job());
      mStep.mockResolvedValueOnce(DONE);
      render(<TranslationScreen pollMs={5} />);
      await startFlow(user);
      expect(await screen.findByLabelText('الترجمة جاهزة')).toBeInTheDocument();
      expect(mStep).toHaveBeenCalledTimes(1);
      expect(mFetch).not.toHaveBeenCalled();
    });

    it('مهمة محفوظة ما زال الخادم يترجمها: تُتابَع تلقائياً بلا ضغط زر وبلا خطوات', async () => {
      setAuthSession(SESSION);
      window.sessionStorage.setItem(ACTIVE_TRANSLATION_KEY, 't-1');
      mFetch.mockResolvedValueOnce(RUNNING(5)).mockResolvedValueOnce(RUNNING(8)).mockResolvedValue({ ...DONE, background: 'idle' });
      render(<TranslationScreen pollMs={5} />);
      expect(await screen.findByLabelText('الترجمة جاهزة')).toBeInTheDocument();
      expect(mStep).not.toHaveBeenCalled();
    });

    it('«ترجماتى»: تظهر الجارية بعد إغلاق التبويب ويفتحها المستخدم فتُتابَع', async () => {
      setAuthSession(SESSION);
      const user = userEvent.setup();
      mMine.mockResolvedValue([
        {
          id: 't-9',
          status: 'translating',
          source_lang: 'ar',
          target_lang: 'en',
          title: 'عقد الإيجار',
          progress: { done_units: 3, total_units: 10, done_batches: 1, total_batches: 3 },
          background: 'running',
          expires_at: '2026-10-17T10:00:00.000Z',
          created_at: '2026-10-15T10:00:00.000Z',
        },
      ]);
      mFetch.mockResolvedValueOnce(job({ id: 't-9', status: 'translating', background: 'running' })).mockResolvedValue({ ...DONE, id: 't-9' });
      render(<TranslationScreen pollMs={5} />);
      const list = await screen.findByLabelText('ترجماتى');
      expect(within(list).getByText(/عقد الإيجار/)).toBeInTheDocument();
      expect(within(list).getByText(/جارية على الخادم \(3\/10\)/)).toBeInTheDocument();
      await user.click(within(list).getByRole('button', { name: 'افتح' }));
      expect(await screen.findByLabelText('الترجمة جاهزة')).toBeInTheDocument();
      expect(window.sessionStorage.getItem(ACTIVE_TRANSLATION_KEY)).toBe('t-9');
    });

    it('فشل جلب «ترجماتى» لا يكسر الصفحة', async () => {
      setAuthSession(SESSION);
      mMine.mockRejectedValue(new ApiError(500, 'x'));
      render(<TranslationScreen />);
      expect(await screen.findByLabelText(/ملف العقد/)).toBeInTheDocument();
      expect(screen.queryByLabelText('ترجماتى')).not.toBeInTheDocument();
    });
  });
});
