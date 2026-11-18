import { ApiError, DraftFieldError, downloadCustomDraft, downloadDraft, fetchDraftTypes, generateCustomDraft, generateDraft } from './api-client';
import { clearAuthSession, setAuthSession } from './auth';

const REQ = { type: 'nda', role: 'discloser', answers: { purpose: 'تقييم' } };

function mockFetch(status: number, body: unknown, extra: Record<string, unknown> = {}) {
  const fn = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    ...extra,
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

describe('drafting api', () => {
  beforeEach(() => {
    clearAuthSession();
    setAuthSession({
      access_token: 'tok',
      refresh_token: 'r',
      user: { id: 'u', email: 'u@e.com', full_name: null, role: 'user', created_at: '2026-01-01T00:00:00.000Z' },
    });
  });

  it('fetchDraftTypes: GET بالتوكن ويعيد العناصر', async () => {
    const fn = mockFetch(200, { items: [{ id: 'nda' }] });
    const items = await fetchDraftTypes();
    expect(items).toEqual([{ id: 'nda' }]);
    const [url, init] = fn.mock.calls[0];
    expect(String(url)).toMatch(/\/drafting\/types$/);
    expect(init.headers.Authorization).toBe('Bearer tok');
  });

  it('generateDraft: POST بالحمولة ويعيد المسودة', async () => {
    const fn = mockFetch(200, { title: 'ت' });
    await expect(generateDraft(REQ)).resolves.toEqual({ title: 'ت' });
    const [url, init] = fn.mock.calls[0];
    expect(String(url)).toMatch(/\/drafting\/generate$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(REQ);
  });

  it('400 بـ field_errors يرمى DraftFieldError بأخطاء الحقول النصية فقط', async () => {
    mockFetch(400, { message: 'x', field_errors: { purpose: 'مطلوب', bad: 5 } });
    const err = await generateDraft(REQ).catch((e) => e);
    expect(err).toBeInstanceOf(DraftFieldError);
    expect(err.fieldErrors).toEqual({ purpose: 'مطلوب' });
    expect(err.status).toBe(400);
  });

  it('400 بلا field_errors رسالة عامة، و401/429/500 برسائل عربية', async () => {
    mockFetch(400, { message: ['x'] });
    await expect(generateDraft(REQ)).rejects.toMatchObject({ status: 400, message: expect.stringContaining('غير صالحة') });
    mockFetch(401, {});
    await expect(generateDraft(REQ)).rejects.toMatchObject({ status: 401, message: expect.stringContaining('سجّل الدخول') });
    mockFetch(429, {});
    await expect(generateDraft(REQ)).rejects.toMatchObject({ status: 429 });
    mockFetch(500, {});
    await expect(generateDraft(REQ)).rejects.toMatchObject({ status: 500, message: expect.stringContaining('HTTP 500') });
  });

  it('فشل الشبكة → ApiError(0)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('net')) as unknown as typeof fetch;
    await expect(fetchDraftTypes()).rejects.toMatchObject({ status: 0 });
    await expect(generateDraft(REQ)).rejects.toBeInstanceOf(ApiError);
  });

  describe('downloadDraft', () => {
    const click = jest.fn();
    let created: HTMLAnchorElement | null = null;
    beforeEach(() => {
      click.mockReset();
      created = null;
      (URL as unknown as { createObjectURL: unknown }).createObjectURL = jest.fn(() => 'blob:x');
      (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = jest.fn();
      const orig = document.createElement.bind(document);
      jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = orig(tag);
        if (tag === 'a') {
          created = el as HTMLAnchorElement;
          el.click = click;
        }
        return el;
      });
    });
    afterEach(() => jest.restoreAllMocks());

    it('يرسل POST?format ويطلق التنزيل باسم الملف من الخادم', async () => {
      const fn = mockFetch(200, null, {
        blob: async () => new Blob(['x']),
        headers: { get: () => 'attachment; filename="contract-draft-nda-20261118.docx"' },
      });
      await downloadDraft(REQ, 'docx');
      expect(String(fn.mock.calls[0][0])).toMatch(/\/drafting\/export\?format=docx$/);
      expect(click).toHaveBeenCalledTimes(1);
      expect(created?.download).toBe('contract-draft-nda-20261118.docx');
    });

    it('اسم احتياطى عند غياب الترويسة، و503 للـPDF برسالة بديلة Word', async () => {
      mockFetch(200, null, { blob: async () => new Blob(['x']), headers: { get: () => null } });
      await downloadDraft(REQ, 'pdf');
      expect(created?.download).toBe('contract-draft.pdf');
      mockFetch(503, {});
      await expect(downloadDraft(REQ, 'pdf')).rejects.toMatchObject({ status: 503, message: expect.stringContaining('Word') });
    });

    it('400 يمرر field_errors', async () => {
      mockFetch(400, { field_errors: { a: 'خطأ' } });
      await expect(downloadDraft(REQ, 'docx')).rejects.toBeInstanceOf(DraftFieldError);
    });
  });

  describe('custom (عقد آخر)', () => {
    it('generateCustomDraft: POST على المسار المساعد بلا type', async () => {
      const fn = mockFetch(200, { title: 'ت', assisted: true });
      await expect(generateCustomDraft({ role: 'first', answers: { purpose: 'x' } })).resolves.toMatchObject({ assisted: true });
      const [url, init] = fn.mock.calls[0];
      expect(String(url)).toMatch(/\/drafting\/custom\/generate$/);
      expect(JSON.parse(init.body)).toEqual({ role: 'first', answers: { purpose: 'x' } });
    });

    it('رسائل الخادم لـ422 و503 تُعرض كما هى، و400 بـfield_errors تُمرَّر', async () => {
      mockFetch(503, { message: 'الصياغة المساعدة لعقد آخر غير مفعّلة حالياً على الخادم.' });
      await expect(generateCustomDraft({ role: 'first', answers: {} })).rejects.toMatchObject({ status: 503, message: expect.stringContaining('غير مفعّلة') });
      mockFetch(422, { message: 'تعذّرت صياغة بنود آمنة لهذا الوصف.' });
      await expect(generateCustomDraft({ role: 'first', answers: {} })).rejects.toMatchObject({ status: 422, message: expect.stringContaining('تعذّرت صياغة') });
      mockFetch(400, { message: 'x', field_errors: { purpose: 'بيانات شخصية' } });
      await expect(generateCustomDraft({ role: 'first', answers: {} })).rejects.toBeInstanceOf(DraftFieldError);
    });

    it('downloadCustomDraft: يرسل المسودة المعدَّلة داخل draft ويطلق التنزيل', async () => {
      const click = jest.fn();
      (URL as unknown as { createObjectURL: unknown }).createObjectURL = jest.fn(() => 'blob:x');
      (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = jest.fn();
      const orig = document.createElement.bind(document);
      jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = orig(tag);
        if (tag === 'a') el.click = click;
        return el;
      });
      const fn = mockFetch(200, null, { blob: async () => new Blob(['x']), headers: { get: () => 'attachment; filename="contract-draft-custom-20261118.docx"' } });
      await downloadCustomDraft({ title: 'ع' } as never, 'docx');
      const [url, init] = fn.mock.calls[0];
      expect(String(url)).toMatch(/\/drafting\/custom\/export\?format=docx$/);
      expect(JSON.parse(init.body)).toEqual({ draft: { title: 'ع' } });
      expect(click).toHaveBeenCalledTimes(1);
      jest.restoreAllMocks();
    });

    it('400 برسالة الخادم وPDF 503 ببديل Word', async () => {
      mockFetch(400, { message: 'البنود: من 1 إلى 40' });
      await expect(downloadCustomDraft({} as never, 'docx')).rejects.toMatchObject({ status: 400, message: expect.stringContaining('البنود: من 1 إلى 40') });
      mockFetch(503, {});
      await expect(downloadCustomDraft({} as never, 'pdf')).rejects.toMatchObject({ message: expect.stringContaining('Word') });
    });
  });
});
