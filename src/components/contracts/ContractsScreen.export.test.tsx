import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContractsScreen } from './ContractsScreen';
import { clearAuthSession, setAuthSession } from '@/lib/auth';
import type { ContractResponse } from '@/lib/types';

jest.mock('@/lib/api-client', () => {
  const actual = jest.requireActual('@/lib/api-client');
  return {
    ...actual,
    uploadContract: jest.fn(),
    approveContractReport: jest.fn(),
    fetchContractOrder: jest.fn(),
    fetchPendingPayments: jest.fn().mockResolvedValue([]),
  };
});

import { approveContractReport, fetchContractOrder, uploadContract } from '@/lib/api-client';
import type { ContractOrder } from '@/lib/types';

const mockedUpload = uploadContract as jest.MockedFunction<typeof uploadContract>;
const mockedOrder = fetchContractOrder as jest.MockedFunction<typeof fetchContractOrder>;
const mockedApprove = approveContractReport as jest.MockedFunction<typeof approveContractReport>;

const PROCESSED: ContractResponse = {
  id: 'contract-1',
  original_filename: 'c.docx',
  status: 'processed',
  extraction_error: null,
  clause_count: 0,
  clauses: [],
  created_at: '2026-10-15T10:00:00.000Z',
};

const FAILED: ContractResponse = {
  id: 'contract-2',
  original_filename: 's.pdf',
  status: 'extraction_failed',
  extraction_error: 'تعذر',
  clause_count: null,
  created_at: '2026-10-15T10:00:00.000Z',
};

const PREVIEW_ORDER: ContractOrder = {
  contract_id: 'contract-1',
  stage: 'preview',
  free_access: false,
  processed: true,
  fee_amount: 250,
  fee_currency: 'EGP',
  payment_instructions: null,
  payment_reference: null,
  approved_at: null,
  paid_at: null,
  can_download_preliminary: true,
  can_download_final: false,
  awaiting_human_review: false,
  details_locked: true,
};

function session(role: 'user' | 'admin') {
  return {
    access_token: 'a',
    refresh_token: 'r',
    user: { id: 'u-1', email: 'u@example.com', full_name: null, role, created_at: '2026-01-01T00:00:00.000Z' },
  };
}

async function upload(response: ContractResponse) {
  mockedUpload.mockResolvedValue(response);
  const user = userEvent.setup();
  render(<ContractsScreen />);
  await user.click(await screen.findByRole('button', { name: 'تخطَّ وأجبنى مباشرة' }));
  const file = new File(['x'], 'c.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  await user.upload(await screen.findByLabelText('ملف العقد'), file);
  const declaration = screen.queryByLabelText(/أقرّ بأن الملف/);
  if (declaration) await user.click(declaration); // العميل فقط؛ المالك بلا إقرار
  await user.click(screen.getByRole('button', { name: /رفع وتحليل العقد/ }));
  await waitFor(() => expect(mockedUpload).toHaveBeenCalled());
  return user;
}

describe('ContractsScreen — تنزيل التقرير واعتماده', () => {
  beforeEach(() => {
    mockedUpload.mockReset();
    mockedApprove.mockReset();
    mockedOrder.mockReset();
    clearAuthSession();
  });

  it('العميل: يرى لوحة الطلب (نسخة أولية) لا أزرار التنزيل النهائى ولا زر الاعتماد', async () => {
    setAuthSession(session('user'));
    mockedOrder.mockResolvedValue(PREVIEW_ORDER);
    await upload(PROCESSED);
    expect(await screen.findByRole('button', { name: /تنزيل النسخة الأولية PDF/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'تنزيل تقرير المراجعة بصيغة PDF' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /اعتماد التقرير/ })).not.toBeInTheDocument();
  });

  it('المالك (admin): يرى أزرار التنزيل المباشرة ونسخة العميل بلا لوحة طلب', async () => {
    setAuthSession(session('admin'));
    await upload(PROCESSED);
    expect(await screen.findByRole('button', { name: 'تنزيل تقرير المراجعة بصيغة PDF' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تنزيل نسخة العميل المبسطة بصيغة PDF' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تنزيل نسخة العميل المبسطة بصيغة Word' })).toBeInTheDocument();
    expect(mockedOrder).not.toHaveBeenCalled();
    expect(await screen.findByText('لا طلبات بانتظار التأكيد.')).toBeInTheDocument();
  });

  it('لا يظهر التنزيل عند فشل استخراج النص', async () => {
    setAuthSession(session('user'));
    await upload(FAILED);
    await screen.findByText('تعذَّر استخراج نص العقد');
    expect(screen.queryByRole('button', { name: /تنزيل تقرير المراجعة/ })).not.toBeInTheDocument();
  });

  it('المدير يعتمد التقرير فيظهر تأكيد ويتعطل الزر', async () => {
    setAuthSession(session('admin'));
    mockedApprove.mockResolvedValue({ approved_at: '2026-10-15T10:05:00.000Z', already_approved: false });
    const user = await upload(PROCESSED);

    await user.click(await screen.findByRole('button', { name: 'اعتماد التقرير للعميل' }));

    expect(mockedApprove).toHaveBeenCalledWith('contract-1');
    expect(await screen.findByRole('status')).toHaveTextContent('اعتُمد التقرير');
    expect(screen.getByRole('button', { name: 'اعتماد التقرير للعميل' })).toBeDisabled();
  });

  it('فشل الاعتماد يعرض تنبيهاً ويبقى الزر متاحاً للمحاولة', async () => {
    setAuthSession(session('admin'));
    mockedApprove.mockRejectedValue(new Error('x'));
    const user = await upload(PROCESSED);

    await user.click(await screen.findByRole('button', { name: 'اعتماد التقرير للعميل' }));

    expect(await screen.findByText('تعذّر اعتماد التقرير — حاول مرة أخرى.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'اعتماد التقرير للعميل' })).toBeEnabled();
  });
});
