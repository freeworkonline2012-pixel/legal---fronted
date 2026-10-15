import {
  ApiError,
  createTranslation,
  deleteTranslation,
  downloadTranslation,
  editTranslationUnit,
  fetchTranslationUnits,
  stepTranslation,
} from './api-client';
import { clearAuthSession, setAuthSession } from './auth';

function mockFetch(status: number, body: unknown, extra: Record<string, unknown> = {}) {
  const fn = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: { get: () => null },
    ...extra,
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

const FILE = new File(['x'], 'عقد.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

describe('translation api client', () => {
  beforeEach(() => {
    clearAuthSession();
    setAuthSession({
      access_token: 'tok',
      refresh_token: 'r',
      user: { id: 'u', email: 'u@e.com', full_name: null, role: 'user', created_at: '2026-01-01T00:00:00.000Z' },
    });
  });

  it('createTranslation: multipart بالتوكن وبلا Content-Type يدوى', async () => {
    const fn = mockFetch(201, { id: 't1' });
    const res = await createTranslation(FILE, 'en', true);
    expect(res.id).toBe('t1');
    const [url, init] = fn.mock.calls[0];
    expect(String(url)).toMatch(/\/translations$/);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(init.headers['Content-Type']).toBeUndefined();
    const form = init.body as FormData;
    expect(form.get('target_lang')).toBe('en');
    expect(form.get('consent')).toBe('true');
    expect(form.get('file')).toBeInstanceOf(File);
  });

  it('createTranslation: 422 يُظهر رسالة الخادم و401/429/413 رسائل عربية ثابتة', async () => {
    mockFetch(422, { message: 'العقد مكتوب أصلاً بالعربية' });
    await expect(createTranslation(FILE, 'ar', true)).rejects.toMatchObject({ status: 422, message: 'العقد مكتوب أصلاً بالعربية' });
    mockFetch(401, {});
    await expect(createTranslation(FILE, 'en', true)).rejects.toMatchObject({ status: 401 });
    mockFetch(429, { message: 'ThrottlerException' });
    await expect(createTranslation(FILE, 'en', true)).rejects.toThrow(/انتظر/);
    mockFetch(429, { message: 'بلغت الحد اليومى لطلبات الترجمة (10)' });
    await expect(createTranslation(FILE, 'en', true)).rejects.toThrow(/الحد اليومى/);
    mockFetch(413, {});
    await expect(createTranslation(FILE, 'en', true)).rejects.toThrow(/10 ميغابايت/);
  });

  it('خطأ التحقق بمصفوفة رسائل يُعرض أول رسالة', async () => {
    mockFetch(400, { message: ['الموافقة الصريحة شرط'] });
    await expect(createTranslation(FILE, 'en', false)).rejects.toThrow('الموافقة الصريحة شرط');
  });

  it('فشل الشبكة يرمى ApiError(0)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('net')) as unknown as typeof fetch;
    await expect(stepTranslation('t1')).rejects.toBeInstanceOf(ApiError);
    await expect(stepTranslation('t1')).rejects.toMatchObject({ status: 0 });
  });

  it('step/units/edit/delete تستخدم المسارات والطرق الصحيحة', async () => {
    let fn = mockFetch(200, { id: 't1' });
    await stepTranslation('t/1');
    expect(String(fn.mock.calls[0][0])).toMatch(/\/translations\/t%2F1\/step$/);
    expect(fn.mock.calls[0][1].method).toBe('POST');

    fn = mockFetch(200, { total: 1, offset: 0, items: [] });
    await fetchTranslationUnits('t1', 5, 25);
    expect(String(fn.mock.calls[0][0])).toMatch(/\/translations\/t1\/units\?offset=5&limit=25$/);

    fn = mockFetch(200, { n: 2 });
    await editTranslationUnit('t1', 2, 'نص');
    expect(fn.mock.calls[0][1].method).toBe('PATCH');
    expect(JSON.parse(fn.mock.calls[0][1].body)).toEqual({ text: 'نص' });
    expect(fn.mock.calls[0][1].headers['Content-Type']).toBe('application/json');

    fn = mockFetch(204, null);
    await deleteTranslation('t1');
    expect(fn.mock.calls[0][1].method).toBe('DELETE');
  });

  it('404 رسالة عربية عن الانتهاء', async () => {
    mockFetch(404, { message: 'x' });
    await expect(stepTranslation('t1')).rejects.toThrow(/انتهت صلاحيتها/);
  });

  it('downloadTranslation: يمرر format وlayout ويطلق تنزيلاً', async () => {
    const blob = new Blob(['x']);
    const fn = mockFetch(200, null, {
      blob: async () => blob,
      headers: { get: (h: string) => (h === 'Content-Disposition' ? 'attachment; filename="translation-ar-en-TRN-1.docx"' : null) },
    });
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = jest.fn(() => 'blob:x');
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = jest.fn();
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    await downloadTranslation('t1', 'docx', 'bilingual');
    expect(String(fn.mock.calls[0][0])).toMatch(/\/translations\/t1\/download\?format=docx&layout=bilingual$/);
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });

  it('downloadTranslation: 503 على PDF يقترح Word', async () => {
    mockFetch(503, { message: 'x' });
    await expect(downloadTranslation('t1', 'pdf', 'translation')).rejects.toThrow(/Word/);
  });
});
