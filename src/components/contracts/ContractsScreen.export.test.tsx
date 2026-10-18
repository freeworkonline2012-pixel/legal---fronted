import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContractsScreen } from './ContractsScreen';
import { clearAuthSession, setAuthSession } from '@/lib/auth';
import type { ContractResponse } from '@/lib/types';

jest.mock('@/lib/api-client', () => {
  const actual = jest.requireActual('@/lib/api-client');
  return { ...actual, uploadContract: jest.fn(), approveContractReport: jest.fn() };
});

import { approveContractReport, uploadContract } from '@/lib/api-client';

const mockedUpload = uploadContract as jest.MockedFunction<typeof uploadContract>;
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
  await user.click(screen.getByRole('button', { name: /رفع وتحليل العقد/ }));
  await waitFor(() => expect(mockedUpload).toHaveBeenCalled());
  return user;
}

describe('ContractsScreen — تنزيل التقرير واعتماده', () => {
  beforeEach(() => {
    mockedUpload.mockReset();
    mockedApprove.mockReset();
    clearAuthSession();
  });

  it('العميل العادى يرى تنزيل التقرير ولا يرى زر الاعتماد', async () => {
    setAuthSession(session('user'));
    await upload(PROCESSED);
    expect(await screen.findByRole('button', { name: 'تنزيل تقرير المراجعة بصيغة PDF' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /اعتماد التقرير/ })).not.toBeInTheDocument();
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
