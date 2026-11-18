/**
 * اختبارات ContractDraftingScreen — صياغة العقود (الأداة الفعلية).
 * تضمن: بوابة تسجيل الدخول، تحميل الكتالوج من الخادم، النموذج الديناميكى (showWhen/الافتراضيات)،
 * عرض أخطاء الحقول من الخادم، معاينة المسودة وفحص الجودة، التنزيل، وعدم ادعاء ما لا يقدّمه النظام.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContractDraftingScreen } from './ContractDraftingScreen';
import { clearAuthSession, setAuthSession } from '@/lib/auth';
import type { DraftResult, DraftTypeSpec } from '@/lib/drafting';

jest.mock('@/lib/api-client', () => {
  const actual = jest.requireActual('@/lib/api-client');
  return { ...actual, fetchDraftTypes: jest.fn(), generateDraft: jest.fn(), downloadDraft: jest.fn() };
});

import { ApiError, DraftFieldError, downloadDraft, fetchDraftTypes, generateDraft } from '@/lib/api-client';

const mockedTypes = fetchDraftTypes as jest.MockedFunction<typeof fetchDraftTypes>;
const mockedGenerate = generateDraft as jest.MockedFunction<typeof generateDraft>;
const mockedDownload = downloadDraft as jest.MockedFunction<typeof downloadDraft>;

const SESSION = {
  access_token: 'a',
  refresh_token: 'r',
  user: { id: 'u-1', email: 'u@example.com', full_name: null, role: 'user' as const, created_at: '2026-01-01T00:00:00.000Z' },
};

const TYPES: DraftTypeSpec[] = [
  {
    id: 'nda',
    label: 'اتفاقية سرية',
    description: 'وصف الاتفاقية',
    roles: [
      { value: 'discloser', label: 'الطرف المفصح' },
      { value: 'recipient', label: 'الطرف المتلقى' },
    ],
    fields: [
      { id: 'party1_name', label: 'اسم الطرف الأول', kind: 'text', required: true, group: 'الأطراف' },
      { id: 'direction', label: 'اتجاه السرية', kind: 'choice', required: true, default: 'one_way', options: [{ value: 'one_way', label: 'من طرف واحد' }, { value: 'mutual', label: 'متبادلة' }], group: 'الأطراف' },
      { id: 'return_days', label: 'مهلة الرد (أيام)', kind: 'number', required: true, showWhen: { field: 'direction', equals: 'mutual' }, group: 'الجزاء' },
      { id: 'start_date', label: 'تاريخ السريان', kind: 'date', required: true, group: 'الجزاء' },
      { id: 'extra', label: 'ملاحظات', kind: 'longtext', required: false, group: 'الجزاء' },
    ],
  },
  { id: 'lease', label: 'عقد إيجار', description: 'وصف الإيجار', roles: [{ value: 'lessor', label: 'المؤجر' }], fields: [] },
];

const RESULT: DraftResult = {
  typeId: 'nda',
  typeLabel: 'اتفاقية سرية',
  title: 'اتفاقية سرية وعدم إفصاح',
  role: 'discloser',
  preamble: ['إنه فى يوم …'],
  clauses: [
    { number: 1, heading: 'البند الأول', title: 'التعريفات', paragraphs: ['يقصد بالمعلومات السرية كل ما يفصح عنه.', '- بند فرعى أول'] },
    { number: 2, heading: 'البند الثانى', title: 'الالتزام', paragraphs: ['يلتزم المتلقى بالسرية.'] },
  ],
  closing: ['الطرف الأول: ........'],
  lawyerNotes: ['راجع صفة الموقعين.'],
  quality: { passed: true, checked: ['x'], findings: [] },
  fullText: 'ن',
};

async function fillMinimum(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('اسم الطرف الأول'), 'شركة الأمل');
  await user.type(screen.getByLabelText('تاريخ السريان'), '2026-12-01');
}

describe('ContractDraftingScreen', () => {
  beforeEach(() => {
    mockedTypes.mockReset();
    mockedGenerate.mockReset();
    mockedDownload.mockReset();
    mockedTypes.mockResolvedValue(TYPES);
    clearAuthSession();
  });

  it('يعرض العنوان وتنبيه المسودة، ولا يدّعى الخدمة «قيد الإعداد»', () => {
    render(<ContractDraftingScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'صياغة العقود' })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('تحتاج مراجعة محامٍ');
    expect(screen.queryByText(/قيد الإعداد/)).not.toBeInTheDocument();
  });

  it('الزائر يرى دعوة تسجيل الدخول ولا يُطلب الكتالوج', async () => {
    render(<ContractDraftingScreen />);
    expect(await screen.findByText('تحتاج تسجيل الدخول أولاً')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'تسجيل الدخول' })).toHaveAttribute('href', '/login');
    expect(mockedTypes).not.toHaveBeenCalled();
  });

  it('المسجَّل: يحمّل الأنواع من الخادم ويعرضها بطاقات', async () => {
    setAuthSession(SESSION);
    render(<ContractDraftingScreen />);
    expect(await screen.findByRole('button', { name: /اتفاقية سرية/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /عقد إيجار/ })).toBeInTheDocument();
    expect(screen.queryByLabelText('اسم الطرف الأول')).not.toBeInTheDocument();
  });

  it('فشل تحميل الأنواع: رسالة وزر إعادة محاولة يعمل', async () => {
    setAuthSession(SESSION);
    mockedTypes.mockRejectedValueOnce(new ApiError(0, 'تعذّر الاتصال بالخادم'));
    const user = userEvent.setup();
    render(<ContractDraftingScreen />);
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر الاتصال بالخادم');
    await user.click(screen.getByRole('button', { name: /إعادة المحاولة/ }));
    expect(await screen.findByRole('button', { name: /اتفاقية سرية/ })).toBeInTheDocument();
  });

  it('اختيار نوع: النموذج بالافتراضيات، وحقل showWhen يظهر عند تبديل الاختيار', async () => {
    setAuthSession(SESSION);
    const user = userEvent.setup();
    render(<ContractDraftingScreen />);
    await user.click(await screen.findByRole('button', { name: /اتفاقية سرية/ }));
    expect(screen.getByLabelText('اتجاه السرية')).toHaveValue('one_way');
    expect(screen.getByLabelText('أنا')).toHaveValue('discloser');
    expect(screen.queryByLabelText(/مهلة الرد/)).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('اتجاه السرية'), 'mutual');
    expect(screen.getByLabelText(/مهلة الرد/)).toBeInTheDocument();
    expect(screen.getByLabelText('ملاحظات (اختيارى)')).toBeInTheDocument();
  });

  it('حقول مطلوبة فارغة: لا إرسال وتظهر الأخطاء', async () => {
    setAuthSession(SESSION);
    const user = userEvent.setup();
    render(<ContractDraftingScreen />);
    await user.click(await screen.findByRole('button', { name: /اتفاقية سرية/ }));
    await user.click(screen.getByRole('button', { name: 'جهّز المسودة' }));
    expect(mockedGenerate).not.toHaveBeenCalled();
    expect(screen.getAllByText('هذا الحقل مطلوب.').length).toBe(2);
  });

  it('الإرسال: يرسل النوع والصفة والإجابات المنظَّفة ثم يعرض المسودة وفحص الجودة', async () => {
    setAuthSession(SESSION);
    mockedGenerate.mockResolvedValueOnce(RESULT);
    const user = userEvent.setup();
    render(<ContractDraftingScreen />);
    await user.click(await screen.findByRole('button', { name: /اتفاقية سرية/ }));
    await user.selectOptions(screen.getByLabelText('أنا'), 'recipient');
    await fillMinimum(user);
    await user.click(screen.getByRole('button', { name: 'جهّز المسودة' }));
    await waitFor(() => expect(mockedGenerate).toHaveBeenCalledTimes(1));
    expect(mockedGenerate).toHaveBeenCalledWith({
      type: 'nda',
      role: 'recipient',
      answers: { party1_name: 'شركة الأمل', direction: 'one_way', start_date: '2026-12-01' },
    });
    expect(await screen.findByRole('heading', { name: 'اتفاقية سرية وعدم إفصاح' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'البند الأول: التعريفات' })).toBeInTheDocument();
    expect(screen.getByText('• بند فرعى أول')).toBeInTheDocument();
    expect(screen.getByText('راجع صفة الموقعين.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('اجتازت المسودة فحص الجودة الآلى');
  });

  it('ملاحظات الجودة تُعرض مرتبة بالخطورة', async () => {
    setAuthSession(SESSION);
    mockedGenerate.mockResolvedValueOnce({
      ...RESULT,
      quality: {
        passed: false,
        checked: [],
        findings: [
          { severity: 'منخفض', title: 'ملاحظة بسيطة', detail: 'د1' },
          { severity: 'عالٍ', title: 'ملاحظة مهمة', detail: 'د2' },
        ],
      },
    });
    const user = userEvent.setup();
    render(<ContractDraftingScreen />);
    await user.click(await screen.findByRole('button', { name: /اتفاقية سرية/ }));
    await fillMinimum(user);
    await user.click(screen.getByRole('button', { name: 'جهّز المسودة' }));
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('سجّل 2 ملاحظة');
    const items = status.querySelectorAll('li');
    expect(items[0]).toHaveTextContent('[عالٍ] ملاحظة مهمة');
    expect(items[1]).toHaveTextContent('[منخفض] ملاحظة بسيطة');
  });

  it('أخطاء الحقول من الخادم تظهر تحت الحقل نفسه ويبقى النموذج', async () => {
    setAuthSession(SESSION);
    mockedGenerate.mockRejectedValueOnce(new DraftFieldError('بعض الإجابات تحتاج تصحيحاً', { start_date: 'تاريخ غير صالح' }));
    const user = userEvent.setup();
    render(<ContractDraftingScreen />);
    await user.click(await screen.findByRole('button', { name: /اتفاقية سرية/ }));
    await fillMinimum(user);
    await user.click(screen.getByRole('button', { name: 'جهّز المسودة' }));
    expect(await screen.findByText('تاريخ غير صالح')).toBeInTheDocument();
    expect(screen.getByText('بعض الإجابات تحتاج تصحيحاً')).toBeInTheDocument();
    expect(screen.getByLabelText('اسم الطرف الأول')).toHaveValue('شركة الأمل');
  });

  it('التنزيل: Word وPDF يمرّران الإجابات نفسها، وخطأ التنزيل يظهر', async () => {
    setAuthSession(SESSION);
    mockedGenerate.mockResolvedValueOnce(RESULT);
    mockedDownload.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new ApiError(503, 'تنزيل PDF غير متاح مؤقتاً'));
    const user = userEvent.setup();
    render(<ContractDraftingScreen />);
    await user.click(await screen.findByRole('button', { name: /اتفاقية سرية/ }));
    await fillMinimum(user);
    await user.click(screen.getByRole('button', { name: 'جهّز المسودة' }));
    await user.click(await screen.findByRole('button', { name: /تنزيل Word/ }));
    expect(mockedDownload).toHaveBeenLastCalledWith(
      { type: 'nda', role: 'discloser', answers: { party1_name: 'شركة الأمل', direction: 'one_way', start_date: '2026-12-01' } },
      'docx',
    );
    await user.click(screen.getByRole('button', { name: /تنزيل PDF/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('تنزيل PDF غير متاح مؤقتاً');
  });

  it('«تعديل الإجابات» يعيد النموذج بإجاباته', async () => {
    setAuthSession(SESSION);
    mockedGenerate.mockResolvedValueOnce(RESULT);
    const user = userEvent.setup();
    render(<ContractDraftingScreen />);
    await user.click(await screen.findByRole('button', { name: /اتفاقية سرية/ }));
    await fillMinimum(user);
    await user.click(screen.getByRole('button', { name: 'جهّز المسودة' }));
    await user.click(await screen.findByRole('button', { name: 'تعديل الإجابات' }));
    expect(screen.getByLabelText('اسم الطرف الأول')).toHaveValue('شركة الأمل');
  });
});
