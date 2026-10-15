import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemosScreen } from './MemosScreen';
import { clearAuthSession, setAuthSession } from '@/lib/auth';
import type { CreateMemoResponse } from '@/lib/types';

jest.mock('@/lib/api-client', () => {
  const actual = jest.requireActual('@/lib/api-client');
  return { ...actual, createMemo: jest.fn(), downloadExport: jest.fn() };
});

import { ApiError, createMemo, downloadExport } from '@/lib/api-client';

const mockedCreate = createMemo as jest.MockedFunction<typeof createMemo>;
const mockedDownload = downloadExport as jest.MockedFunction<typeof downloadExport>;

const SESSION = {
  access_token: 'a',
  refresh_token: 'r',
  user: { id: 'u-1', email: 'u@example.com', full_name: null, role: 'user' as const, created_at: '2026-01-01T00:00:00.000Z' },
};

const ISSUE = 'هل يستحق العامل تعويضاً عن إنهاء عقده دون إخطار مسبق؟';
const FACTS = 'عمل لدى الشركة منذ عام 2021 بعقد غير محدد المدة وأُنهيت خدمته دون إخطار كتابى.';

const RESPONSE: CreateMemoResponse = {
  memo: {
    id: 'memo-1',
    memo_type: 'opinion_memo',
    party_role: 'advisory',
    title: 'مذكرة بشأن إنهاء عقد عمل دون إخطار',
    answer_id: 'ans-1',
    created_at: '2026-10-15T10:00:00.000Z',
  },
  status: 'draft',
  answer: {
    id: 'ans-1',
    answer: 'نعم، تستحق تعويضاً.',
    refused: false,
    citations: [],
    structured: null,
  },
};

async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/المسألة القانونية/), ISSUE);
  await user.type(screen.getByLabelText(/^الوقائع/), FACTS);
}

describe('MemosScreen', () => {
  beforeEach(() => {
    mockedCreate.mockReset();
    mockedDownload.mockReset();
    clearAuthSession();
  });

  it('يعرض دعوة لتسجيل الدخول للزائر بدل النموذج', async () => {
    render(<MemosScreen />);
    expect(await screen.findByText('تحتاج تسجيل الدخول أولاً')).toBeInTheDocument();
    expect(screen.queryByLabelText(/المسألة القانونية/)).not.toBeInTheDocument();
  });

  it('يعرض تنبيه المسودة الدائم', async () => {
    setAuthSession(SESSION);
    render(<MemosScreen />);
    expect(await screen.findByText(/مسودة — تحتاج مراجعة محامٍ/)).toBeInTheDocument();
  });

  it('يمنع الإرسال بمسألة ووقائع قصيرتين دون استدعاء الخادم', async () => {
    setAuthSession(SESSION);
    const user = userEvent.setup();
    render(<MemosScreen />);
    await user.type(await screen.findByLabelText(/المسألة القانونية/), 'قصيرة');
    await user.type(screen.getByLabelText(/^الوقائع/), 'قصيرة');
    await user.click(screen.getByRole('button', { name: 'جهّز المسودة' }));
    expect(await screen.findByText(/المسألة قصيرة جداً/)).toBeInTheDocument();
    expect(screen.getByText(/الوقائع قصيرة جداً/)).toBeInTheDocument();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('يرسل الحمولة الصحيحة ويعرض أزرار تنزيل المذكرة', async () => {
    setAuthSession(SESSION);
    mockedCreate.mockResolvedValue(RESPONSE);
    const user = userEvent.setup();
    render(<MemosScreen />);
    await screen.findByLabelText(/المسألة القانونية/);
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'جهّز المسودة' }));
    await waitFor(() => expect(screen.getByTestId('memo-result')).toBeInTheDocument());
    expect(mockedCreate).toHaveBeenCalledWith({
      memo_type: 'opinion_memo',
      party_role: 'advisory',
      issue: ISSUE,
      facts: FACTS,
    });
    await user.click(screen.getByRole('button', { name: 'تنزيل المسودة بصيغة PDF' }));
    expect(mockedDownload).toHaveBeenCalledWith('memos', 'memo-1', 'pdf');
  });

  it('حقل الطلبات لمذكرة الدفاع فقط ويُرسل مرتَّباً بلا الفارغ', async () => {
    setAuthSession(SESSION);
    mockedCreate.mockResolvedValue(RESPONSE);
    const user = userEvent.setup();
    render(<MemosScreen />);
    await screen.findByLabelText(/المسألة القانونية/);
    expect(screen.queryByRole('button', { name: 'إضافة طلب' })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('نوع المستند'), 'defense_memo');
    await user.selectOptions(screen.getByLabelText('صفة مقدِّم المستند'), 'claimant');
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'إضافة طلب' }));
    await user.click(screen.getByRole('button', { name: 'إضافة طلب' }));
    await user.click(screen.getByRole('button', { name: 'إضافة طلب' }));
    await user.type(screen.getByLabelText('الطلب 1'), 'الحكم بالتعويض');
    await user.type(screen.getByLabelText('الطلب 3'), 'إلزام الشركة بالمصروفات');
    await user.click(screen.getByRole('button', { name: 'جهّز المسودة' }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalled());
    expect(mockedCreate).toHaveBeenCalledWith({
      memo_type: 'defense_memo',
      party_role: 'claimant',
      issue: ISSUE,
      facts: FACTS,
      requests: ['الحكم بالتعويض', 'إلزام الشركة بالمصروفات'],
    });
  });

  it('لا يرسل طلبات سبق إدخالها إذا تغيّر النوع إلى غير مذكرة الدفاع', async () => {
    setAuthSession(SESSION);
    mockedCreate.mockResolvedValue(RESPONSE);
    const user = userEvent.setup();
    render(<MemosScreen />);
    await screen.findByLabelText(/المسألة القانونية/);
    await user.selectOptions(screen.getByLabelText('نوع المستند'), 'defense_memo');
    await user.click(screen.getByRole('button', { name: 'إضافة طلب' }));
    await user.type(screen.getByLabelText('الطلب 1'), 'طلب');
    await user.selectOptions(screen.getByLabelText('نوع المستند'), 'legal_report');
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'جهّز المسودة' }));
    await waitFor(() => expect(mockedCreate).toHaveBeenCalled());
    expect(mockedCreate.mock.calls[0][0]).not.toHaveProperty('requests');
    expect(mockedCreate.mock.calls[0][0].memo_type).toBe('legal_report');
  });

  it('يعرض رسالة الخادم عند عدم كفاية الأسانيد (422) ولا يعرض أزرار تنزيل', async () => {
    setAuthSession(SESSION);
    mockedCreate.mockRejectedValue(new ApiError(422, 'لم نجد سنداً قانونياً موثَّقاً كافياً لهذه المسألة.'));
    const user = userEvent.setup();
    render(<MemosScreen />);
    await screen.findByLabelText(/المسألة القانونية/);
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'جهّز المسودة' }));
    expect(await screen.findByText(/لم نجد سنداً قانونياً موثَّقاً كافياً/)).toBeInTheDocument();
    expect(screen.queryByTestId('export-memos')).not.toBeInTheDocument();
  });

  it('زر «مذكرة جديدة» يفرّغ الحقول والنتيجة', async () => {
    setAuthSession(SESSION);
    mockedCreate.mockResolvedValue(RESPONSE);
    const user = userEvent.setup();
    render(<MemosScreen />);
    await screen.findByLabelText(/المسألة القانونية/);
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'جهّز المسودة' }));
    await screen.findByTestId('memo-result');
    await user.click(screen.getByRole('button', { name: /مذكرة جديدة/ }));
    expect(screen.queryByTestId('memo-result')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/المسألة القانونية/)).toHaveValue('');
  });
});
