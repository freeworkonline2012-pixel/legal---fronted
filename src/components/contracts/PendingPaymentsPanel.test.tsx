import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PendingPaymentsPanel } from './PendingPaymentsPanel';
import type { PendingPayment } from '@/lib/types';

jest.mock('@/lib/api-client', () => {
  const actual = jest.requireActual('@/lib/api-client');
  return { ...actual, fetchPendingPayments: jest.fn(), confirmContractPayment: jest.fn() };
});

import { ApiError, confirmContractPayment, fetchPendingPayments } from '@/lib/api-client';

const list = fetchPendingPayments as jest.MockedFunction<typeof fetchPendingPayments>;
const confirm = confirmContractPayment as jest.MockedFunction<typeof confirmContractPayment>;

const ITEM: PendingPayment = {
  contract_id: 'c1',
  original_filename: 'عقد.docx',
  fee_amount: 250,
  fee_currency: 'EGP',
  payment_reference: 'TX-1',
  submitted_at: '2026-11-18T10:00:00Z',
};

beforeEach(() => {
  list.mockReset();
  confirm.mockReset();
});

describe('PendingPaymentsPanel', () => {
  it('قائمة فارغة', async () => {
    list.mockResolvedValue([]);
    render(<PendingPaymentsPanel />);
    expect(await screen.findByText('لا طلبات بانتظار التأكيد.')).toBeInTheDocument();
  });

  it('يؤكد السداد فيختفى الطلب من القائمة', async () => {
    list.mockResolvedValue([ITEM]);
    confirm.mockResolvedValue({} as never);
    const user = userEvent.setup();
    render(<PendingPaymentsPanel />);
    expect(await screen.findByText(/TX-1/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /تأكيد سداد عقد.docx/ }));
    expect(confirm).toHaveBeenCalledWith('c1');
    expect(await screen.findByText('لا طلبات بانتظار التأكيد.')).toBeInTheDocument();
  });

  it('فشل التأكيد: رسالة الخادم ويبقى الطلب', async () => {
    list.mockResolvedValue([ITEM]);
    confirm.mockRejectedValue(new ApiError(403, 'غير مصرح'));
    const user = userEvent.setup();
    render(<PendingPaymentsPanel />);
    await user.click(await screen.findByRole('button', { name: /تأكيد سداد/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('غير مصرح');
    expect(screen.getByText(/TX-1/)).toBeInTheDocument();
  });

  it('فشل التحميل: رسالة', async () => {
    list.mockRejectedValue(new ApiError(500, 'تعذّر'));
    render(<PendingPaymentsPanel />);
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر');
  });
});
