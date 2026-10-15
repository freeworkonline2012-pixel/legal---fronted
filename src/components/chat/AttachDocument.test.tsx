import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AttachDocument } from './AttachDocument';
import { clearAuthSession, setAuthSession } from '@/lib/auth';

jest.mock('@/lib/api-client', () => {
  const actual = jest.requireActual('@/lib/api-client');
  return { ...actual, analyzeDocument: jest.fn() };
});
import { ApiError, analyzeDocument } from '@/lib/api-client';
const mocked = analyzeDocument as jest.MockedFunction<typeof analyzeDocument>;

const RESULT = {
  doc_type: 'عقد عمل',
  facts: [
    { label: 'الأجر الشهرى', value: '5000 جنيه', quote: 'الأجر الشهرى 5000 جنيه' },
    { label: 'تاريخ البدء', value: '1/1/2021', quote: 'يبدأ فى 1/1/2021' },
  ],
  redactions: { national_id: 1 },
  redactions_total: 1,
  truncated: false,
  ocr: false,
  warnings: ['تنبيه OCR'],
};

function login() {
  setAuthSession({
    access_token: 'tok',
    refresh_token: 'r',
    user: { id: 'u', email: 'u@e.com', full_name: null, role: 'user', created_at: '2026-01-01T00:00:00.000Z' },
  });
}
const pdf = () => new File([new Uint8Array([1])], 'c.pdf', { type: 'application/pdf' });

describe('AttachDocument', () => {
  beforeEach(() => {
    clearAuthSession();
    mocked.mockReset();
  });

  it('الزائر يرى دعوة تسجيل الدخول فقط', async () => {
    render(<AttachDocument question="س" onChange={jest.fn()} />);
    expect(await screen.findByRole('link', { name: 'سجّل الدخول' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /أرفق مستنداً/ })).toBeNull();
  });

  it('زر التحليل معطّل حتى الموافقة واختيار ملف سليم', async () => {
    login();
    const user = userEvent.setup();
    render(<AttachDocument question="س" onChange={jest.fn()} />);
    await user.click(await screen.findByRole('button', { name: /أرفق مستنداً/ }));
    const analyze = screen.getByRole('button', { name: 'حلّل المستند' });
    expect(analyze).toBeDisabled();
    expect(screen.getByText(/لا نحجب الأسماء والعناوين/)).toBeInTheDocument();
    await user.upload(screen.getByLabelText(/الملف/), pdf());
    expect(analyze).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /أوافق/ }));
    expect(analyze).toBeEnabled();
  });

  it('يرفض نوع ملف غير مدعوم برسالة', async () => {
    login();
    const user = userEvent.setup({ applyAccept: false });
    render(<AttachDocument question="س" onChange={jest.fn()} />);
    await user.click(await screen.findByRole('button', { name: /أرفق مستنداً/ }));
    await user.upload(screen.getByLabelText(/الملف/), new File(['x'], 'a.exe'));
    expect(screen.getByRole('alert')).toHaveTextContent(/غير مدعوم/);
  });

  it('تدفق كامل: تحليل ← مراجعة (استبعاد وتعديل) ← اعتماد ← إزالة', async () => {
    login();
    mocked.mockResolvedValue(RESULT);
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(<AttachDocument question="هل لى تعويض؟" onChange={onChange} />);
    await user.click(await screen.findByRole('button', { name: /أرفق مستنداً/ }));
    await user.upload(screen.getByLabelText(/الملف/), pdf());
    await user.click(screen.getByRole('checkbox', { name: /أوافق/ }));
    await user.click(screen.getByRole('button', { name: 'حلّل المستند' }));

    expect(await screen.findByText(/حجبنا قبل المعالجة: 1 أرقام قومية/)).toBeInTheDocument();
    expect(screen.getByText('تنبيه OCR')).toBeInTheDocument();
    expect(screen.getByText(/من المستند: «الأجر الشهرى 5000 جنيه»/)).toBeInTheDocument();
    expect(mocked).toHaveBeenCalledWith(expect.any(File), true, 'هل لى تعويض؟');

    await user.click(screen.getByRole('checkbox', { name: 'اعتماد: تاريخ البدء' }));
    const value = screen.getByLabelText('قيمة: الأجر الشهرى');
    await user.clear(value);
    await user.type(value, '6000 جنيه');
    await user.click(screen.getByRole('button', { name: /اعتمد الوقائع المحددة \(1\)/ }));

    expect(onChange).toHaveBeenCalledWith(
      [{ question: 'الأجر الشهرى (من المستند)', answer: '6000 جنيه', kind: 'custom' }],
      { docType: 'عقد عمل', factsCount: 1 },
    );
    expect(screen.getByTestId('document-attached')).toHaveTextContent(/أُرفقت 1 وقائع/);

    await user.click(screen.getByRole('button', { name: /إزالة/ }));
    expect(onChange).toHaveBeenLastCalledWith([], null);
  });

  it('خطأ الخادم يظهر ويبقى النموذج متاحاً', async () => {
    login();
    mocked.mockRejectedValue(new ApiError(422, 'تعذّرت قراءة المستند'));
    const user = userEvent.setup();
    render(<AttachDocument question="س" onChange={jest.fn()} />);
    await user.click(await screen.findByRole('button', { name: /أرفق مستنداً/ }));
    await user.upload(screen.getByLabelText(/الملف/), pdf());
    await user.click(screen.getByRole('checkbox', { name: /أوافق/ }));
    await user.click(screen.getByRole('button', { name: 'حلّل المستند' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('تعذّرت قراءة المستند'));
    expect(screen.getByRole('button', { name: 'حلّل المستند' })).toBeInTheDocument();
  });

  it('لا وقائع موثقة => رسالة وزر الاعتماد معطّل', async () => {
    login();
    mocked.mockResolvedValue({ ...RESULT, facts: [], redactions: {}, redactions_total: 0, warnings: [] });
    const user = userEvent.setup();
    render(<AttachDocument question="س" onChange={jest.fn()} />);
    await user.click(await screen.findByRole('button', { name: /أرفق مستنداً/ }));
    await user.upload(screen.getByLabelText(/الملف/), pdf());
    await user.click(screen.getByRole('checkbox', { name: /أوافق/ }));
    await user.click(screen.getByRole('button', { name: 'حلّل المستند' }));
    expect(await screen.findByText(/لم نستخرج وقائع موثقة/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /اعتمد الوقائع المحددة \(0\)/ })).toBeDisabled();
  });
});
