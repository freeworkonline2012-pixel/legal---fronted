import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContractOrderPanel } from './ContractOrderPanel';
import type { ContractOrder } from '@/lib/types';

jest.mock('@/lib/api-client', () => {
  const actual = jest.requireActual('@/lib/api-client');
  return {
    ...actual,
    fetchContractOrder: jest.fn(),
    approveContractOrder: jest.fn(),
    submitContractPayment: jest.fn(),
    downloadExport: jest.fn(),
  };
});

import {
  ApiError,
  approveContractOrder,
  downloadExport,
  fetchContractOrder,
  submitContractPayment,
} from '@/lib/api-client';

const fetchOrder = fetchContractOrder as jest.MockedFunction<typeof fetchContractOrder>;
const approve = approveContractOrder as jest.MockedFunction<typeof approveContractOrder>;
const pay = submitContractPayment as jest.MockedFunction<typeof submitContractPayment>;
const dl = downloadExport as jest.MockedFunction<typeof downloadExport>;

function order(over: Partial<ContractOrder> = {}): ContractOrder {
  return {
    contract_id: 'c1',
    stage: 'preview',
    free_access: false,
    processed: true,
    fee_amount: 250,
    fee_currency: 'EGP',
    payment_instructions: 'حوّل على المحفظة رقم 000',
    payment_reference: null,
    approved_at: null,
    paid_at: null,
    can_download_preliminary: false,
    can_download_final: false,
    awaiting_human_review: false,
    details_locked: true,
    ...over,
  };
}

beforeEach(() => {
  [fetchOrder, approve, pay, dl].forEach((m) => m.mockReset());
});

describe('ContractOrderPanel', () => {
  it('لا يعرض شيئاً للمالك (free_access)', async () => {
    fetchOrder.mockResolvedValue(order({ free_access: true, stage: 'paid' }));
    const { container } = render(<ContractOrderPanel contractId="c1" />);
    await waitFor(() => expect(fetchOrder).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('مرحلة المعاينة: لا زر تنزيل قبل السداد، والموافقة معطلة حتى يؤشّر الإقرار، ثم يوافق', async () => {
    fetchOrder.mockResolvedValue(order());
    approve.mockResolvedValue(order({ stage: 'approved', approved_at: '2026-11-18T10:00:00Z' }));
    const user = userEvent.setup();
    render(<ContractOrderPanel contractId="c1" />);

    await screen.findByRole('button', { name: 'أوافق وأتابع للسداد' });
    expect(screen.queryByRole('button', { name: /تنزيل/ })).not.toBeInTheDocument();

    const go = screen.getByRole('button', { name: 'أوافق وأتابع للسداد' });
    expect(go).toBeDisabled();
    await user.click(screen.getByLabelText(/أوافق على المتابعة/));
    await user.click(go);
    expect(approve).toHaveBeenCalledWith('c1');
    expect(await screen.findByText('حوّل على المحفظة رقم 000')).toBeInTheDocument();
  });

  it('بلا سعر مضبوط: لا موافقة، مع رسالة', async () => {
    fetchOrder.mockResolvedValue(order({ fee_amount: null }));
    render(<ContractOrderPanel contractId="c1" />);
    expect(await screen.findByText(/لم يُحدَّد سعر الخدمة/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'أوافق وأتابع للسداد' })).toBeDisabled();
  });

  it('مرحلة السداد: يرسل مرجع السداد ويعرض الانتظار', async () => {
    fetchOrder.mockResolvedValue(order({ stage: 'approved' }));
    pay.mockResolvedValue(order({ stage: 'payment_submitted', payment_reference: 'TX-123' }));
    const user = userEvent.setup();
    render(<ContractOrderPanel contractId="c1" />);

    const send = await screen.findByRole('button', { name: 'تم السداد' });
    expect(send).toBeDisabled();
    await user.type(screen.getByLabelText(/مرجع السداد/), 'TX-123');
    await user.click(send);
    expect(pay).toHaveBeenCalledWith('c1', 'TX-123');
    expect(await screen.findByText(/بانتظار تأكيد الإدارة/)).toBeInTheDocument();
    expect(screen.getByText(/TX-123/)).toBeInTheDocument();
  });

  it('رسالة الخادم تظهر عند فشل الإجراء', async () => {
    fetchOrder.mockResolvedValue(order({ stage: 'approved' }));
    pay.mockRejectedValue(new ApiError(409, 'تم تأكيد السداد مسبقاً'));
    const user = userEvent.setup();
    render(<ContractOrderPanel contractId="c1" />);
    await user.type(await screen.findByLabelText(/مرجع السداد/), 'TX-9');
    await user.click(screen.getByRole('button', { name: 'تم السداد' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('تم تأكيد السداد مسبقاً');
  });

  it('بعد السداد وقبل اعتماد المراجعة البشرية: لا تنزيل مع رسالة', async () => {
    fetchOrder.mockResolvedValue(order({ stage: 'paid', awaiting_human_review: true, details_locked: false }));
    render(<ContractOrderPanel contractId="c1" />);
    expect(await screen.findByText(/قيد المراجعة البشرية/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /تنزيل Word/ })).not.toBeInTheDocument();
  });

  it('بعد السداد والاعتماد: تنزيل Word أو PDF حسب اختيار العميل', async () => {
    fetchOrder.mockResolvedValue(order({ stage: 'paid', can_download_final: true, details_locked: false }));
    dl.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ContractOrderPanel contractId="c1" />);
    await user.click(await screen.findByRole('button', { name: /تنزيل Word/ }));
    expect(dl).toHaveBeenCalledWith('contracts', 'c1', 'tracked');
    await user.click(screen.getByRole('button', { name: /تنزيل PDF/ }));
    expect(dl).toHaveBeenCalledWith('contracts', 'c1', 'pdf', 'client');
  });

  it('onPaid يُستدعى عند الانتقال إلى مسدَّد بعد تحديث الحالة، لا عند التحميل الأول', async () => {
    const onPaid = jest.fn();
    fetchOrder.mockResolvedValueOnce(order({ stage: 'payment_submitted', payment_reference: 'TX' }));
    fetchOrder.mockResolvedValueOnce(order({ stage: 'paid', can_download_final: true, details_locked: false }));
    const user = userEvent.setup();
    render(<ContractOrderPanel contractId="c1" onPaid={onPaid} />);
    await screen.findByText(/بانتظار تأكيد الإدارة/);
    expect(onPaid).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /تحديث الحالة/ }));
    await waitFor(() => expect(onPaid).toHaveBeenCalledTimes(1));
  });

  it('فشل تحميل الحالة: رسالة وإعادة محاولة', async () => {
    fetchOrder.mockRejectedValueOnce(new ApiError(500, 'خطأ'));
    fetchOrder.mockResolvedValueOnce(order());
    const user = userEvent.setup();
    render(<ContractOrderPanel contractId="c1" />);
    await user.click(await screen.findByRole('button', { name: 'إعادة المحاولة' }));
    expect(await screen.findByRole('button', { name: 'أوافق وأتابع للسداد' })).toBeInTheDocument();
  });
});
