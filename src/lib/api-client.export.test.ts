/**
 * اختبارات تنزيل المستندات (PDF/Word) — downloadExport / approveContractReport /
 * parseDownloadFilename. الخادم يبنى المستند من سجل مملوك للمستخدم؛ هنا نتحقق
 * أن الواجهة ترسل التوكن، تقرأ اسم الملف، وتحوّل كل فشل إلى رسالة عربية مفهومة.
 */

import { ApiError, approveContractReport, downloadExport, parseDownloadFilename } from './api-client';
import { getAccessToken } from './auth';

jest.mock('./auth', () => ({
  getAccessToken: jest.fn(),
}));

const mockedToken = getAccessToken as jest.MockedFunction<typeof getAccessToken>;

function fileResponse(disposition: string | null, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => (name.toLowerCase() === 'content-disposition' ? disposition : null) },
    blob: async () => new Blob(['%PDF-1.7'], { type: 'application/pdf' }),
    json: async () => ({}),
  } as unknown as Response;
}

function errorResponse(status: number, body?: unknown): Response {
  return {
    ok: false,
    status,
    headers: { get: () => null },
    json: async () => {
      if (body === undefined) throw new Error('no json');
      return body;
    },
  } as unknown as Response;
}

describe('parseDownloadFilename', () => {
  it('يقرأ الاسم بين علامتى اقتباس', () => {
    expect(parseDownloadFilename('attachment; filename="shield-answer-ANS-1A2B3C4D.pdf"')).toBe(
      'shield-answer-ANS-1A2B3C4D.pdf',
    );
  });

  it('يعيد null عند غياب الرأس أو الاسم', () => {
    expect(parseDownloadFilename(null)).toBeNull();
    expect(parseDownloadFilename('attachment')).toBeNull();
  });

  it('لا يقبل مسارات أو رموزاً خطرة فى الاسم', () => {
    expect(parseDownloadFilename('attachment; filename="../../etc/passwd"')).toBeNull();
  });
});

describe('downloadExport', () => {
  const mockFetch = jest.fn();
  let clicked: { href: string; download: string } | null;
  let createUrl: jest.Mock;
  let revokeUrl: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    mockFetch.mockReset();
    global.fetch = mockFetch as unknown as typeof fetch;
    mockedToken.mockReturnValue('tok-1');
    clicked = null;
    createUrl = jest.fn().mockReturnValue('blob:mock');
    revokeUrl = jest.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: createUrl, configurable: true, writable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeUrl, configurable: true, writable: true });
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked = { href: this.href, download: this.download };
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('يطلب المسار الصحيح مع Bearer وصيغة pdf وينزّل بالاسم القادم من الخادم', async () => {
    mockFetch.mockResolvedValue(fileResponse('attachment; filename="shield-answer-ANS-1A2B3C4D.pdf"'));

    await downloadExport('answers', 'a-1', 'pdf');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/exports/answers/a-1?format=pdf');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-1');
    expect(clicked?.download).toBe('shield-answer-ANS-1A2B3C4D.pdf');
    expect(clicked?.href).toBe('blob:mock');
  });

  it('يستعمل اسماً احتياطياً إن لم يصل رأس الاسم (Word)', async () => {
    mockFetch.mockResolvedValue(fileResponse(null));
    await downloadExport('governance', 'g-1', 'docx');
    expect(mockFetch.mock.calls[0][0]).toContain('/exports/governance/g-1?format=docx');
    expect(clicked?.download).toBe('document.docx');
  });

  it('يلغى رابط الكائن بعد مهلة', async () => {
    mockFetch.mockResolvedValue(fileResponse(null));
    await downloadExport('contracts', 'c-1', 'pdf');
    expect(revokeUrl).not.toHaveBeenCalled();
    jest.advanceTimersByTime(10_000);
    expect(revokeUrl).toHaveBeenCalledWith('blob:mock');
  });

  it('409 يعرض رسالة الخادم العربية كما هى (مثال: التقرير قيد المراجعة)', async () => {
    mockFetch.mockResolvedValue(
      errorResponse(409, { message: 'التقرير قيد المراجعة البشرية وسيتاح للتنزيل فور اعتماده.' }),
    );
    await expect(downloadExport('contracts', 'c-1', 'pdf')).rejects.toMatchObject({
      status: 409,
      message: 'التقرير قيد المراجعة البشرية وسيتاح للتنزيل فور اعتماده.',
    });
    expect(clicked).toBeNull();
  });

  it('404 رسالة مفهومة بلا كشف سبب (غير مالك = غير موجود)', async () => {
    mockFetch.mockResolvedValue(errorResponse(404, { message: 'x' }));
    await expect(downloadExport('answers', 'a-9', 'pdf')).rejects.toThrow('تعذّر العثور على هذا المستند');
  });

  it('503 فى PDF يقترح Word، و503 فى Word رسالة عامة', async () => {
    mockFetch.mockResolvedValue(errorResponse(503));
    await expect(downloadExport('answers', 'a-1', 'pdf')).rejects.toThrow('نسخة Word');
    await expect(downloadExport('answers', 'a-1', 'docx')).rejects.toThrow('HTTP 503');
  });

  it('429 و401 رسائل مخصصة', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(429)).mockResolvedValueOnce(errorResponse(401));
    await expect(downloadExport('answers', 'a-1', 'pdf')).rejects.toThrow('انتظر قليلاً');
    await expect(downloadExport('answers', 'a-1', 'pdf')).rejects.toThrow('سجّل الدخول');
  });

  it('فشل الشبكة يرمى ApiError بالحالة 0', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));
    const err = await downloadExport('answers', 'a-1', 'pdf').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(0);
  });

  it('يرمّز المعرّف فى المسار', async () => {
    mockFetch.mockResolvedValue(fileResponse(null));
    await downloadExport('answers', 'a/../b', 'pdf');
    expect(mockFetch.mock.calls[0][0]).toContain('/exports/answers/a%2F..%2Fb?format=pdf');
  });
});

describe('approveContractReport', () => {
  const mockFetch = jest.fn();
  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch as unknown as typeof fetch;
    mockedToken.mockReturnValue('tok-admin');
  });

  it('يرسل POST إلى مسار الاعتماد مع الملاحظة اختيارياً', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ approved_at: '2026-10-15T10:00:00.000Z', already_approved: false }),
    });
    const res = await approveContractReport('c-1', 'روجع');
    expect(res.already_approved).toBe(false);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/exports/contracts/c-1/approve');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ note: 'روجع' }));
  });
});
