import { ApiError, createMemo } from './api-client';
import { clearAuthSession, setAuthSession } from './auth';

const PAYLOAD = {
  memo_type: 'opinion_memo' as const,
  party_role: 'advisory' as const,
  issue: 'هل يستحق العامل تعويضاً؟',
  facts: 'عمل لدى الشركة منذ عام 2021 وأُنهيت خدمته دون إخطار كتابى.',
};

function mockFetch(status: number, body: unknown) {
  const fn = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

describe('createMemo', () => {
  beforeEach(() => clearAuthSession());

  it('يرسل POST /memos بالتوكن والحمولة ويعيد الرد', async () => {
    setAuthSession({
      access_token: 'tok',
      refresh_token: 'r',
      user: { id: 'u', email: 'u@e.com', full_name: null, role: 'user', created_at: '2026-01-01T00:00:00.000Z' },
    });
    const fn = mockFetch(201, { memo: { id: 'm1' }, status: 'draft' });
    const res = await createMemo(PAYLOAD);
    expect(res.memo.id).toBe('m1');
    const [url, init] = fn.mock.calls[0];
    expect(String(url)).toMatch(/\/memos$/);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body)).toEqual(PAYLOAD);
  });

  it('422 يُظهر رسالة الخادم', async () => {
    mockFetch(422, { message: 'لا أسانيد كافية' });
    await expect(createMemo(PAYLOAD)).rejects.toMatchObject({ status: 422, message: 'لا أسانيد كافية' });
  });

  it('401 و429 و400 برسائل عربية خاصة', async () => {
    mockFetch(401, {});
    await expect(createMemo(PAYLOAD)).rejects.toMatchObject({ status: 401, message: expect.stringContaining('سجّل الدخول') });
    mockFetch(429, {});
    await expect(createMemo(PAYLOAD)).rejects.toMatchObject({ status: 429 });
    mockFetch(400, { message: ['x'] });
    await expect(createMemo(PAYLOAD)).rejects.toMatchObject({ status: 400 });
  });

  it('انقطاع الاتصال يرمى ApiError بحالة 0', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('net')) as unknown as typeof fetch;
    await expect(createMemo(PAYLOAD)).rejects.toBeInstanceOf(ApiError);
  });
});
