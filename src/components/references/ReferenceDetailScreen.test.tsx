import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReferenceDetailScreen } from './ReferenceDetailScreen';

jest.mock('@/lib/api-client', () => {
  class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  return {
    ApiError,
    fetchLegalReferenceDetail: jest.fn(),
    fetchLegalReferenceSection: jest.fn(),
  };
});

import { ApiError, fetchLegalReferenceDetail, fetchLegalReferenceSection } from '@/lib/api-client';

const mockedDetail = fetchLegalReferenceDetail as jest.MockedFunction<typeof fetchLegalReferenceDetail>;
const mockedSection = fetchLegalReferenceSection as jest.MockedFunction<typeof fetchLegalReferenceSection>;

const DETAIL = {
  id: 'r1',
  title: 'شرح قانون العمل',
  author: 'د. أحمد فؤاد',
  publisher: 'دار النهضة',
  edition: 'الثالثة',
  published_year: 2019,
  reference_type: 'law_commentary' as const,
  country_code: 'EG',
  category: 'labor',
  summary: 'شرح مفصل',
  section_count: 2,
  created_at: '2026-01-01T00:00:00.000Z',
  source_note: 'نسخة ورقية ممسوحة',
  rights_note: 'مرفوع بإذن المؤلف',
  toc: [
    { seq: 1, heading: 'الباب الأول', page_from: 1, page_to: 10 },
    { seq: 2, heading: 'الباب الثانى', page_from: 11, page_to: 20 },
  ],
};

function section(seq: number, body: string, prev: number | null, next: number | null) {
  return {
    reference_id: 'r1',
    reference_title: 'شرح قانون العمل',
    seq,
    heading: seq === 1 ? 'الباب الأول' : 'الباب الثانى',
    page_from: null,
    page_to: null,
    body,
    prev_seq: prev,
    next_seq: next,
  };
}

describe('ReferenceDetailScreen', () => {
  beforeEach(() => {
    mockedDetail.mockReset().mockResolvedValue(DETAIL);
    mockedSection.mockReset().mockImplementation(async (_id, seq) =>
      seq === 1 ? section(1, 'متن القسم الأول', null, 2) : section(2, 'متن القسم الثانى', 1, null),
    );
  });

  it('يعرض البيانات الوصفية والتنبيه والمصدر والحقوق ثم أول قسم افتراضياً', async () => {
    render(<ReferenceDetailScreen id="r1" />);
    expect(await screen.findByRole('heading', { level: 1, name: 'شرح قانون العمل' })).toBeInTheDocument();
    expect(screen.getByText('دار النهضة')).toBeInTheDocument();
    expect(screen.getByText(/للاطلاع والبحث فقط/)).toBeInTheDocument();
    expect(screen.getByText(/نسخة ورقية ممسوحة/)).toBeInTheDocument();
    expect(screen.getByText(/مرفوع بإذن المؤلف/)).toBeInTheDocument();
    expect(await screen.findByText('متن القسم الأول')).toBeInTheDocument();
    expect(mockedSection).toHaveBeenCalledWith('r1', 1);
  });

  it('يفتح القسم المحدد فى الرابط، وقسم غير موجود فى الفهرس يعود لأول قسم', async () => {
    const { unmount } = render(<ReferenceDetailScreen id="r1" initialSeq={2} />);
    expect(await screen.findByText('متن القسم الثانى')).toBeInTheDocument();
    unmount();
    mockedSection.mockClear();
    render(<ReferenceDetailScreen id="r1" initialSeq={99} />);
    expect(await screen.findByText('متن القسم الأول')).toBeInTheDocument();
    expect(mockedSection).not.toHaveBeenCalledWith('r1', 99);
  });

  it('التنقل بين الأقسام بالأزرار وبالفهرس، وتعطيل السابق فى أول قسم', async () => {
    const user = userEvent.setup();
    render(<ReferenceDetailScreen id="r1" />);
    await screen.findByText('متن القسم الأول');
    expect(screen.getByRole('button', { name: 'القسم السابق' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'القسم التالى' }));
    expect(await screen.findByText('متن القسم الثانى')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'القسم التالى' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /الباب الأول/ }));
    expect(await screen.findByText('متن القسم الأول')).toBeInTheDocument();
  });

  it('مرجع غير موجود: رسالة واضحة برابط العودة', async () => {
    mockedDetail.mockReset().mockRejectedValue(new ApiError(404, 'nf'));
    render(<ReferenceDetailScreen id="zzz" />);
    expect(await screen.findByText('المرجع غير موجود')).toBeInTheDocument();
  });

  it('مرجع بلا أقسام: رسالة "لا يوجد متن" ولا طلب قسم', async () => {
    mockedDetail.mockReset().mockResolvedValue({ ...DETAIL, section_count: 0, toc: [] });
    render(<ReferenceDetailScreen id="r1" />);
    expect(await screen.findByText('لا يوجد متن لهذا المرجع بعد')).toBeInTheDocument();
    expect(mockedSection).not.toHaveBeenCalled();
  });

  it('فشل تحميل قسم يُظهر خطأً مع إعادة محاولة تنجح', async () => {
    mockedSection.mockReset().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(section(1, 'متن القسم الأول', null, 2));
    const user = userEvent.setup();
    render(<ReferenceDetailScreen id="r1" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر تحميل هذا القسم');
    await user.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    await waitFor(() => expect(screen.getByText('متن القسم الأول')).toBeInTheDocument());
  });
});
