import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WordAddinScreen } from './WordAddinScreen';
import { clearAuthSession, setAuthSession } from '@/lib/auth';
import type { ContractResponse } from '@/lib/types';

jest.mock('@/lib/api-client', () => {
  const actual = jest.requireActual('@/lib/api-client');
  return { ...actual, loginUser: jest.fn(), logoutUser: jest.fn(), uploadContract: jest.fn(), fetchContract: jest.fn() };
});
jest.mock('@/lib/office-bridge', () => ({
  loadOfficeJs: jest.fn(),
  isInsideWord: jest.fn(),
  supportsComments: jest.fn(),
  readOpenDocument: jest.fn(),
  insertComments: jest.fn(),
}));

import { ApiError, fetchContract, loginUser, uploadContract } from '@/lib/api-client';
import { insertComments, isInsideWord, loadOfficeJs, readOpenDocument, supportsComments } from '@/lib/office-bridge';

const mLogin = loginUser as jest.Mock;
const mUpload = uploadContract as jest.Mock;
const mFetch = fetchContract as jest.Mock;
const mLoad = loadOfficeJs as jest.Mock;
const mInside = isInsideWord as jest.Mock;
const mComments = supportsComments as jest.Mock;
const mRead = readOpenDocument as jest.Mock;
const mInsert = insertComments as jest.Mock;

const SESSION = {
  access_token: 'a',
  refresh_token: 'r',
  user: { id: 'u-1', email: 'u@example.com', full_name: null, role: 'user' as const, created_at: '2026-01-01T00:00:00.000Z' },
};
const DOC = new File(['x'], 'contract.docx');

function processed(over: Partial<ContractResponse> = {}): ContractResponse {
  return {
    id: 'k1',
    original_filename: 'contract.docx',
    status: 'processed',
    extraction_error: null,
    clause_count: 2,
    clauses: [
      {
        id: 'c1', clause_index: 1, clause_label: 'البند 1', clause_title: null, clause_type_guess: null,
        clause_text: 'يلتزم الطرف الثانى بسداد مبلغ شهرى ثابت طوال مدة العقد',
        assessment_status: 'يحتاج مراجعة', assessment_reasoning: 'مخالف لنص آمر', matched_articles: null, assessment_confidence: 0.9,
      },
      {
        id: 'c2', clause_index: 2, clause_label: 'البند 2', clause_title: null, clause_type_guess: null,
        clause_text: 'مدة العقد سنة واحدة', assessment_status: 'سليم', assessment_reasoning: null, matched_articles: null, assessment_confidence: 0.9,
      },
    ],
    contract_findings: [],
    created_at: '2026-11-18T00:00:00Z',
    ...over,
  };
}

describe('WordAddinScreen', () => {
  beforeEach(() => {
    [mLogin, mUpload, mFetch, mLoad, mInside, mComments, mRead, mInsert].forEach((m) => m.mockReset());
    clearAuthSession();
    mLoad.mockResolvedValue({});
    mInside.mockResolvedValue(true);
    mComments.mockReturnValue(true);
    mRead.mockResolvedValue(DOC);
  });

  it('خارج Word: رسالة واضحة ورابط المانيفست بلا نموذج', async () => {
    mInside.mockResolvedValue(false);
    render(<WordAddinScreen />);
    expect(await screen.findByText(/تعمل داخل Microsoft Word فقط/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /المانيفست/ })).toHaveAttribute('href', '/word-addin/manifest.xml');
    expect(screen.queryByLabelText('البريد الإلكترونى')).not.toBeInTheDocument();
  });

  it('بلا Office.js (تعذّر التحميل) يُعامل كخارج Word', async () => {
    mLoad.mockResolvedValue(null);
    render(<WordAddinScreen />);
    expect(await screen.findByText(/تعمل داخل Microsoft Word فقط/)).toBeInTheDocument();
  });

  it('تسجيل الدخول: يحفظ الجلسة ويفتح شاشة التدقيق؛ خطأ 401 برسالة عربية', async () => {
    const user = userEvent.setup();
    render(<WordAddinScreen />);
    mLogin.mockRejectedValueOnce(new ApiError(401, 'Unauthorized'));
    await user.type(await screen.findByLabelText('البريد الإلكترونى'), 'u@example.com');
    await user.type(screen.getByLabelText('كلمة المرور'), 'secret');
    await user.click(screen.getByRole('button', { name: 'دخول' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('البريد أو كلمة المرور غير صحيحة');
    mLogin.mockResolvedValueOnce(SESSION);
    await user.click(screen.getByRole('button', { name: 'دخول' }));
    expect(await screen.findByRole('button', { name: /دقّق العقد المفتوح/ })).toBeInTheDocument();
    expect(screen.queryByLabelText('كلمة المرور')).not.toBeInTheDocument();
  });

  it('الإقرار بعدم وجود بيانات شخصية شرط: الزر معطّل حتى التأشير ولا رفع قبله', async () => {
    setAuthSession(SESSION);
    render(<WordAddinScreen />);
    const btn = await screen.findByRole('button', { name: /دقّق العقد المفتوح/ });
    expect(btn).toBeDisabled();
    expect(mUpload).not.toHaveBeenCalled();
  });

  it('تدفق كامل: قراءة المستند ← رفع خلفى ← متابعة ← ملخص ← إدراج التعليقات بعدد الخطة', async () => {
    setAuthSession(SESSION);
    const user = userEvent.setup();
    mUpload.mockResolvedValue(processed({ status: 'processing', clauses: [], clause_count: null }));
    mFetch.mockResolvedValue(processed());
    mInsert.mockResolvedValue({ inserted: 1, general: 0, notFound: 0 });
    render(<WordAddinScreen />);
    await user.click(await screen.findByLabelText(/أقرّ بأن المستند لا يتضمن بيانات شخصية/));
    await user.click(screen.getByRole('button', { name: /دقّق العقد المفتوح/ }));
    expect(await screen.findByLabelText('نتيجة التدقيق', undefined, { timeout: 8000 })).toBeInTheDocument();
    expect(mRead).toHaveBeenCalledTimes(1);
    expect(mUpload).toHaveBeenCalledWith(DOC, null, { background: true });
    expect(screen.getByText('يحتاج مراجعة: 1')).toBeInTheDocument();
    expect(screen.getByText('سليم: 1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /أدرج الملاحظات تعليقات فى المستند \(1\)/ }));
    await waitFor(() => expect(mInsert).toHaveBeenCalledTimes(1));
    expect(mInsert.mock.calls[0][0]).toHaveLength(1);
    expect(await screen.findByText(/أُدرج 1 تعليقاً/)).toBeInTheDocument();
  }, 15000);

  it('عقد مقفل التفاصيل: يعرض الملخص دون زر تعليقات', async () => {
    setAuthSession(SESSION);
    const user = userEvent.setup();
    mUpload.mockResolvedValue(processed({ details_locked: true }));
    render(<WordAddinScreen />);
    await user.click(await screen.findByLabelText(/أقرّ بأن المستند/));
    await user.click(screen.getByRole('button', { name: /دقّق العقد المفتوح/ }));
    expect(await screen.findByText(/مقفلة حتى إتمام الطلب/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /أدرج الملاحظات/ })).not.toBeInTheDocument();
  });

  it('Word بلا دعم التعليقات: رسالة بديلة ولا زر', async () => {
    setAuthSession(SESSION);
    mComments.mockReturnValue(false);
    const user = userEvent.setup();
    mUpload.mockResolvedValue(processed());
    render(<WordAddinScreen />);
    await user.click(await screen.findByLabelText(/أقرّ بأن المستند/));
    await user.click(screen.getByRole('button', { name: /دقّق العقد المفتوح/ }));
    expect(await screen.findByText(/لا يدعم إدراج التعليقات/)).toBeInTheDocument();
  });

  it('فشل القراءة أو الرفع يُعرض خطأ ولا يُسقط اللوحة؛ 401 يعيد لشاشة الدخول', async () => {
    setAuthSession(SESSION);
    const user = userEvent.setup();
    mRead.mockRejectedValueOnce(new Error('حجم المستند كبير جداً — الحد الأقصى 10 ميجابايت.'));
    render(<WordAddinScreen />);
    await user.click(await screen.findByLabelText(/أقرّ بأن المستند/));
    await user.click(screen.getByRole('button', { name: /دقّق العقد المفتوح/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('10 ميجابايت');
    mUpload.mockRejectedValueOnce(new ApiError(401, 'x'));
    await user.click(screen.getByRole('button', { name: /دقّق العقد المفتوح/ }));
    expect(await screen.findByLabelText('تسجيل الدخول')).toBeInTheDocument();
  });

  it('المالك (admin) لا يُطلب منه الإقرار', async () => {
    setAuthSession({ ...SESSION, user: { ...SESSION.user, role: 'admin' as const } });
    render(<WordAddinScreen />);
    const btn = await screen.findByRole('button', { name: /دقّق العقد المفتوح/ });
    expect(btn).toBeEnabled();
    expect(screen.queryByLabelText(/أقرّ بأن المستند/)).not.toBeInTheDocument();
  });
});
