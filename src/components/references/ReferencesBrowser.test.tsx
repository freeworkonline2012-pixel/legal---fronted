import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReferencesBrowser } from './ReferencesBrowser';

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
    fetchCountries: jest.fn(),
    fetchLegalReferences: jest.fn(),
    searchLegalReferences: jest.fn(),
  };
});

import { ApiError, fetchCountries, fetchLegalReferences, searchLegalReferences } from '@/lib/api-client';

const mockedCountries = fetchCountries as jest.MockedFunction<typeof fetchCountries>;
const mockedList = fetchLegalReferences as jest.MockedFunction<typeof fetchLegalReferences>;
const mockedSearch = searchLegalReferences as jest.MockedFunction<typeof searchLegalReferences>;

function book(id: string, title: string) {
  return {
    id,
    title,
    author: 'د. أحمد فؤاد',
    publisher: null,
    edition: null,
    published_year: 2019,
    reference_type: 'law_commentary' as const,
    country_code: 'EG',
    category: 'labor',
    summary: null,
    section_count: 3,
    created_at: '2026-01-01T00:00:00.000Z',
  };
}

describe('ReferencesBrowser', () => {
  beforeEach(() => {
    mockedCountries.mockReset().mockResolvedValue({
      items: [{ code: 'EG', name_ar: 'مصر', name_en: 'Egypt', display_order: 1, is_active: true, law_count: 1 }],
    });
    mockedList.mockReset().mockResolvedValue({ items: [book('r1', 'شرح قانون العمل')], total: 1 });
    mockedSearch.mockReset().mockResolvedValue({ items: [], total: 0 });
  });

  it('يعرض المراجع بروابط القراءة ويمرّر الدولة المبدئية للخادم', async () => {
    render(<ReferencesBrowser initialCountry="EG" />);
    const link = await screen.findByRole('link', { name: /شرح قانون العمل/ });
    expect(link).toHaveAttribute('href', '/references/r1');
    expect(mockedList).toHaveBeenCalledWith(expect.objectContaining({ country: 'EG', offset: 0 }));
    expect(screen.getByText('1 مرجعاً')).toBeInTheDocument();
  });

  it('لا مراجع: رسالة "لا توجد مراجع بعد"', async () => {
    mockedList.mockReset().mockResolvedValue({ items: [], total: 0 });
    render(<ReferencesBrowser />);
    expect(await screen.findByText('لا توجد مراجع بعد')).toBeInTheDocument();
  });

  it('فشل الجلب يُظهر خطأً مع إعادة محاولة تنجح', async () => {
    mockedList.mockReset().mockRejectedValueOnce(new ApiError(500, 'boom')).mockResolvedValue({
      items: [book('r1', 'شرح قانون العمل')],
      total: 1,
    });
    const user = userEvent.setup();
    render(<ReferencesBrowser />);
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر الاتصال');
    await user.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(await screen.findByRole('link', { name: /شرح قانون العمل/ })).toBeInTheDocument();
  });

  it('"عرض المزيد" يطلب الصفحة التالية ويلصقها بعد الحالية', async () => {
    mockedList
      .mockReset()
      .mockResolvedValueOnce({ items: [book('r1', 'الأول')], total: 2 })
      .mockResolvedValueOnce({ items: [book('r2', 'الثانى')], total: 2 });
    const user = userEvent.setup();
    render(<ReferencesBrowser />);
    await screen.findByRole('link', { name: /الأول/ });
    await user.click(screen.getByRole('button', { name: /عرض المزيد/ }));
    expect(await screen.findByRole('link', { name: /الثانى/ })).toBeInTheDocument();
    expect(mockedList).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 1 }));
    expect(screen.queryByRole('button', { name: /عرض المزيد/ })).not.toBeInTheDocument();
  });

  it('البحث داخل النصوص: نص قصير لا يرسل طلباً، ونص صالح يعرض مقتطفاً مظلّلاً بقسمه', async () => {
    mockedSearch.mockReset().mockResolvedValue({
      items: [
        {
          reference_id: 'r1',
          reference_title: 'شرح قانون العمل',
          author: null,
          reference_type: 'law_commentary',
          country_code: 'EG',
          seq: 4,
          heading: 'الباب الأول',
          page_from: 11,
          page_to: 20,
          snippet: 'يعرف [[عقد]] العمل',
        },
      ],
      total: 1,
    });
    const user = userEvent.setup();
    render(<ReferencesBrowser />);
    await screen.findByRole('link', { name: /شرح قانون العمل/ });

    await user.click(screen.getByRole('tab', { name: 'داخل نصوص المراجع' }));
    expect(screen.getByText(/اكتب حرفين على الأقل/)).toBeInTheDocument();
    expect(mockedSearch).not.toHaveBeenCalled();

    await user.type(screen.getByRole('searchbox'), 'عقد');
    const hit = await screen.findByRole('link', { name: /الباب الأول/ });
    expect(hit).toHaveAttribute('href', '/references/r1?s=4');
    expect(hit).toHaveTextContent('ص 11–20');
    expect(screen.getByText('عقد').tagName).toBe('MARK');
    expect(mockedSearch).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'عقد' }));
  });

  it('رد متأخر لطلب أقدم لا يطغى على نتيجة الطلب الأحدث', async () => {
    let resolveOld: (v: Awaited<ReturnType<typeof fetchLegalReferences>>) => void = () => undefined;
    mockedList
      .mockReset()
      .mockImplementationOnce(() => new Promise((res) => (resolveOld = res)))
      .mockResolvedValue({ items: [book('new', 'النتيجة الجديدة')], total: 1 });
    const user = userEvent.setup();
    render(<ReferencesBrowser />);
    await user.type(screen.getByRole('searchbox'), 'جديد');
    expect(await screen.findByRole('link', { name: /النتيجة الجديدة/ })).toBeInTheDocument();
    await act(async () => {
      resolveOld({ items: [book('old', 'نتيجة قديمة')], total: 1 });
    });
    await waitFor(() => expect(screen.queryByText('نتيجة قديمة')).not.toBeInTheDocument());
    expect(screen.getByRole('link', { name: /النتيجة الجديدة/ })).toBeInTheDocument();
  });
});
