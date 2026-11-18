/**
 * اختبارات ContractDraftingScreen — صياغة العقود (الأداة الفعلية).
 * تضمن: بوابة تسجيل الدخول، تحميل الكتالوج من الخادم، النموذج الديناميكى (showWhen/الافتراضيات)،
 * عرض أخطاء الحقول من الخادم، معاينة المسودة وفحص الجودة، التنزيل، وعدم ادعاء ما لا يقدّمه النظام.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContractDraftingScreen } from './ContractDraftingScreen';
import { clearAuthSession, setAuthSession } from '@/lib/auth';
import type { DraftResult, DraftTypeSpec } from '@/lib/drafting';

jest.mock('@/lib/api-client', () => {
  const actual = jest.requireActual('@/lib/api-client');
  return { ...actual, fetchDraftTypes: jest.fn(), generateDraft: jest.fn(), downloadDraft: jest.fn(), generateCustomDraft: jest.fn(), downloadCustomDraft: jest.fn() };
});

import { ApiError, DraftFieldError, downloadCustomDraft, downloadDraft, fetchDraftTypes, generateCustomDraft, generateDraft } from '@/lib/api-client';

const mockedTypes = fetchDraftTypes as jest.MockedFunction<typeof fetchDraftTypes>;
const mockedGenerate = generateDraft as jest.MockedFunction<typeof generateDraft>;
const mockedDownload = downloadDraft as jest.MockedFunction<typeof downloadDraft>;
const mockedGenCustom = generateCustomDraft as jest.MockedFunction<typeof generateCustomDraft>;
const mockedDownloadCustom = downloadCustomDraft as jest.MockedFunction<typeof downloadCustomDraft>;

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
  {
    id: 'custom',
    assisted: true,
    label: 'عقد آخر',
    description: 'أى عقد آخر',
    roles: [{ value: 'first', label: 'أنا الطرف الأول' }, { value: 'second', label: 'أنا الطرف الثانى' }],
    fields: [
      { id: 'contract_type_name', label: 'نوع العقد', kind: 'text', required: true, group: 'نوع العقد' },
      { id: 'purpose', label: 'وصف الصفقة', kind: 'longtext', required: true, group: 'نوع العقد' },
    ],
  },
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

async function pickType(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.click(await screen.findByRole('button', { name }));
}

describe('ContractDraftingScreen', () => {
  beforeEach(() => {
    mockedTypes.mockReset();
    mockedGenerate.mockReset();
    mockedDownload.mockReset();
    mockedGenCustom.mockReset();
    mockedDownloadCustom.mockReset();
    mockedTypes.mockResolvedValue(TYPES);
    clearAuthSession();
  });

  it('يعرض العنوان وتنبيه المسودة، ولا يدّعى الخدمة «قيد الإعداد»', () => {
    render(<ContractDraftingScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'صياغة العقود' })).toBeInTheDocument();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    expect(screen.queryByText(/قيد الإعداد/)).not.toBeInTheDocument();
  });

  it('الزائر يرى دعوة تسجيل الدخول ولا يُطلب الكتالوج', async () => {
    render(<ContractDraftingScreen />);
    expect(await screen.findByText('تحتاج تسجيل الدخول أولاً')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'تسجيل الدخول' })).toHaveAttribute('href', '/login');
    expect(mockedTypes).not.toHaveBeenCalled();
  });

  it('المسجَّل: يحمّل الأنواع من الخادم ويعرضها فى قائمة منسدلة', async () => {
    setAuthSession(SESSION);
    render(<ContractDraftingScreen />);
    expect(await screen.findByRole('button', { name: /اتفاقية سرية/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /عقد إيجار/ })).toBeInTheDocument();
    expect(screen.queryByLabelText('اسم الطرف الأول')).not.toBeInTheDocument();
  });

  it('الصفحة بلا ملاحظة صفراء ولا قائمة منسدلة: بحث + قوالب جاهزة + تصنيفات', async () => {
    setAuthSession(SESSION);
    render(<ContractDraftingScreen />);
    expect(await screen.findByRole('searchbox')).toBeInTheDocument();
    expect(screen.queryByText(/الناتج مسودة دائماً/)).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /اختر نوع العقد/ })).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'قوالب جاهزة محكَّمة' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'تصنيفات العقود' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /عقود البيع/ })).toBeInTheDocument();
  });

  it('تصفّح تصنيف ثم اختيار صيغة منه: اسم الصيغة يملأ «نوع العقد» ويمكن تغيير النوع', async () => {
    setAuthSession(SESSION);
    const user = userEvent.setup();
    render(<ContractDraftingScreen />);
    await user.click(await screen.findByRole('button', { name: /عقود البيع/ }));
    await user.click(screen.getByRole('button', { name: /عقد بيع شقة بالتقسيط/ }));
    expect(screen.getByRole('textbox', { name: /نوع العقد/ })).toHaveValue('عقد بيع شقة بالتقسيط');
    expect(screen.getByRole('region', { name: 'النوع المختار' })).toHaveTextContent('عقد بيع شقة بالتقسيط');
    await user.click(screen.getByRole('button', { name: 'تغيير النوع' }));
    expect(await screen.findByRole('searchbox')).toBeInTheDocument();
  });

  it('البحث يجد الصيغة بأى إملاء، وغير الموجود يُعرض كنوع عقد آخر', async () => {
    setAuthSession(SESSION);
    const user = userEvent.setup();
    render(<ContractDraftingScreen />);
    await user.type(await screen.findByRole('searchbox'), 'ايجار سياره');
    expect(await screen.findByRole('button', { name: /عقد إيجار سيارة/ })).toBeInTheDocument();
    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'عقد توريد أجهزة');
    await user.click(await screen.findByRole('button', { name: /صُغ «عقد توريد أجهزة» كنوع عقد آخر/ }));
    expect(screen.getByRole('textbox', { name: /نوع العقد/ })).toHaveValue('عقد توريد أجهزة');
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
    await pickType(user, /اتفاقية سرية/);
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
    await pickType(user, /اتفاقية سرية/);
    await user.click(screen.getByRole('button', { name: 'جهّز المسودة' }));
    expect(mockedGenerate).not.toHaveBeenCalled();
    expect(screen.getAllByText('هذا الحقل مطلوب.').length).toBe(2);
  });

  it('الإرسال: يرسل النوع والصفة والإجابات المنظَّفة ثم يعرض المسودة وفحص الجودة', async () => {
    setAuthSession(SESSION);
    mockedGenerate.mockResolvedValueOnce(RESULT);
    const user = userEvent.setup();
    render(<ContractDraftingScreen />);
    await pickType(user, /اتفاقية سرية/);
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
    await pickType(user, /اتفاقية سرية/);
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
    await pickType(user, /اتفاقية سرية/);
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
    await pickType(user, /اتفاقية سرية/);
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
    await pickType(user, /اتفاقية سرية/);
    await fillMinimum(user);
    await user.click(screen.getByRole('button', { name: 'جهّز المسودة' }));
    await user.click(await screen.findByRole('button', { name: 'تعديل الإجابات' }));
    expect(screen.getByLabelText('اسم الطرف الأول')).toHaveValue('شركة الأمل');
  });

  describe('«عقد آخر» (صياغة بمساعدة نموذج لغوى)', () => {
    const CUSTOM_RESULT: DraftResult = {
      ...RESULT,
      typeId: 'custom',
      assisted: true,
      blankSlots: 1,
      title: 'عقد توريد',
      typeLabel: 'عقد توريد',
      clauses: [
        { number: 1, heading: 'البند الأول', title: 'الثمن', paragraphs: ['يسدد الطرف الثانى الثمن خلال [____] يوماً من الاستلام.'] },
        { number: 2, heading: 'البند الثانى', title: 'التسليم', paragraphs: ['يسلم الطرف الأول المعدات فى الموعد المتفق عليه.'] },
      ],
    };

    async function openCustom(user: ReturnType<typeof userEvent.setup>) {
      await pickType(user, /عقد آخر/);
      await user.type(screen.getByRole('textbox', { name: 'نوع العقد' }), 'عقد توريد');
      await user.type(screen.getByLabelText('وصف الصفقة'), 'توريد معدات مكتبية على دفعات');
    }

    it('يعرض ملاحظة الخصوصية، ويرسل للمسار المساعد بلا حقل type', async () => {
      setAuthSession(SESSION);
      mockedGenCustom.mockResolvedValueOnce(CUSTOM_RESULT);
      const user = userEvent.setup();
      render(<ContractDraftingScreen />);
      await openCustom(user);
      expect(screen.getByText(/لا تُرسل للنموذج أبداً/)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'جهّز المسودة' }));
      await waitFor(() => expect(mockedGenCustom).toHaveBeenCalledTimes(1));
      expect(mockedGenerate).not.toHaveBeenCalled();
      expect(mockedGenCustom).toHaveBeenCalledWith({ role: 'first', answers: { contract_type_name: 'عقد توريد', purpose: 'توريد معدات مكتبية على دفعات' } });
      expect(await screen.findByText(/صاغها نموذج لغوى — تحتاج مراجعة محامٍ متخصص/)).toBeInTheDocument();
      expect(screen.getByText(/يوجد 1 فراغ/)).toBeInTheDocument();
    });

    it('تحرير النص ثم التنزيل يرسل النص المعدَّل ويحدّث عدد الفراغات', async () => {
      setAuthSession(SESSION);
      mockedGenCustom.mockResolvedValueOnce(CUSTOM_RESULT);
      mockedDownloadCustom.mockResolvedValueOnce(undefined);
      const user = userEvent.setup();
      render(<ContractDraftingScreen />);
      await openCustom(user);
      await user.click(screen.getByRole('button', { name: 'جهّز المسودة' }));
      await user.click(await screen.findByRole('button', { name: 'تحرير نص البنود' }));
      const box = screen.getByLabelText('البند الأول — فقرة 1');
      await user.clear(box);
      await user.type(box, 'يسدد الطرف الثانى الثمن خلال ثلاثين يوماً.');
      expect(screen.getByText(/لا فراغات متبقية/)).toBeInTheDocument();
      expect(screen.getByText(/نتيجة الفحص أدناه للنص الأصلى/)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /تنزيل Word/ }));
      expect(mockedDownloadCustom).toHaveBeenCalledTimes(1);
      const [sent, fmt] = mockedDownloadCustom.mock.calls[0];
      expect(fmt).toBe('docx');
      expect(sent.clauses[0].paragraphs[0]).toBe('يسدد الطرف الثانى الثمن خلال ثلاثين يوماً.');
      expect(sent.clauses[1].paragraphs[0]).toBe(CUSTOM_RESULT.clauses[1].paragraphs[0]);
      expect(mockedDownload).not.toHaveBeenCalled();
    });

    it('خدمة الصياغة غير مفعّلة (503) تظهر برسالة الخادم ويبقى النموذج', async () => {
      setAuthSession(SESSION);
      mockedGenCustom.mockRejectedValueOnce(new ApiError(503, 'الصياغة المساعدة لعقد آخر غير مفعّلة حالياً على الخادم.'));
      const user = userEvent.setup();
      render(<ContractDraftingScreen />);
      await openCustom(user);
      await user.click(screen.getByRole('button', { name: 'جهّز المسودة' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('غير مفعّلة حالياً');
      expect(screen.getByRole('textbox', { name: 'نوع العقد' })).toHaveValue('عقد توريد');
    });

    it('النوع الجاهز لا يعرض أدوات التحرير ولا ملاحظة النموذج اللغوى', async () => {
      setAuthSession(SESSION);
      mockedGenerate.mockResolvedValueOnce(RESULT);
      const user = userEvent.setup();
      render(<ContractDraftingScreen />);
      await pickType(user, /اتفاقية سرية/);
      await fillMinimum(user);
      await user.click(screen.getByRole('button', { name: 'جهّز المسودة' }));
      await screen.findByRole('heading', { name: 'اتفاقية سرية وعدم إفصاح' });
      expect(screen.queryByRole('button', { name: 'تحرير نص البنود' })).not.toBeInTheDocument();
      expect(screen.queryByText(/صاغها نموذج لغوى/)).not.toBeInTheDocument();
    });
  });
});
