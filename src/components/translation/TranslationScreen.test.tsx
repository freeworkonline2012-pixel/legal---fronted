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
  };
});

import {
  ApiError,
  createTranslation,
  deleteTranslation,
  downloadTranslation,
  editTranslationUnit,
  fetchTranslation,
  fetchTranslationUnits,
  stepTranslation,
} from '@/lib/api-client';

const mCreate = createTranslation as jest.MockedFunction<typeof createTranslation>;
const mStep = stepTranslation as jest.MockedFunction<typeof stepTranslation>;
const mFetch = fetchTranslation as jest.MockedFunction<typeof fetchTranslation>;
const mUnits = fetchTranslationUnits as jest.MockedFunction<typeof fetchTranslationUnits>;
const mEdit = editTranslationUnit as jest.MockedFunction<typeof editTranslationUnit>;
const mDelete = deleteTranslation as jest.MockedFunction<typeof deleteTranslation>;
const mDownload = downloadTranslation as jest.MockedFunction<typeof downloadTranslation>;

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
    [mCreate, mStep, mFetch, mUnits, mEdit, mDelete, mDownload].forEach((m) => m.mockReset());
    clearAuthSession();
    window.sessionStorage.clear();
  });

  it('يعرض دعوة لتسجيل الدخول للزائر بدل النموذج', async () => {
    render(<TranslationScreen />);
    expect(await screen.findByText('تحتاج تسجيل الدخول أولاً')).toBeInTheDocument();
    expect(screen.queryByLabelText(/ملف العقد/)).not.toBeInTheDocument();
  });

  it('يعرض تنبيه المسودة وإفصاح الخصوصية ويعطل البدء قبل الملف والموافقة', async () => {
    setAuthSession(SESSION);
    render(<TranslationScreen />);
    expect(await screen.findByText(/مسودة ترجمة تحتاج مراجعة/)).toBeInTheDocument();
    expect(screen.getAllByText(/بما فيه الأسماء والعناوين/).length).toBeGreaterThanOrEqual(1);
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

    expect(mCreate).toHaveBeenCalledWith(DOCX, 'en', true);
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
    expect(mCreate).toHaveBeenCalledWith(DOCX, 'ar', true);
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
});
