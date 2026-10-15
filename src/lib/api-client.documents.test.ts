import { ApiError, analyzeDocument } from './api-client';
import { clearAuthSession, setAuthSession } from './auth';

function mockFetch(status: number, body: unknown) {
  const fn = jest.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}
const FILE = new File([new Uint8Array([1, 2, 3])], 'c.pdf', { type: 'application/pdf' });

describe('analyzeDocument', () => {
  beforeEach(() => {
    clearAuthSession();
    setAuthSession({
      access_token: 'tok',
      refresh_token: 'r',
      user: { id: 'u', email: 'u@e.com', full_name: null, role: 'user', created_at: '2026-01-01T00:00:00.000Z' },
    });
  });

  it('يرسل multipart بالتوكن والموافقة دون Content-Type', async () => {
    const fn = mockFetch(201, { doc_type: 'عقد', facts: [], redactions: {}, redactions_total: 0, truncated: false, ocr: false, warnings: [] });
    const res = await analyzeDocument(FILE, true, '  سؤال  ');
    expect(res.doc_type).toBe('عقد');
    const [url, init] = fn.mock.calls[0];
    expect(String(url)).toMatch(/\/documents\/analyze$/);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(init.headers['Content-Type']).toBeUndefined();
    const form = init.body as FormData;
    expect(form.get('consent')).toBe('true');
    expect(form.get('question')).toBe('سؤال');
    expect((form.get('file') as File).name).toBe('c.pdf');
  });

  it.each([
    [401, /سجّل الدخول/],
    [413, /8 ميغابايت/],
    [429, /طلبات كثيرة/],
  ])('HTTP %s يعطى رسالة عربية', async (status, re) => {
    mockFetch(status, {});
    await expect(analyzeDocument(FILE, true)).rejects.toThrow(re);
  });

  it('422 يُظهر رسالة الخادم', async () => {
    mockFetch(422, { message: 'تعذّرت قراءة المستند' });
    await expect(analyzeDocument(FILE, true)).rejects.toMatchObject({ status: 422, message: 'تعذّرت قراءة المستند' });
  });

  it('انقطاع الشبكة => ApiError(0)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('x')) as unknown as typeof fetch;
    await expect(analyzeDocument(FILE, true)).rejects.toBeInstanceOf(ApiError);
  });
});
