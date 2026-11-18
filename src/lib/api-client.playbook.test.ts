import { ApiError, fetchOfficePlaybook, resetOfficePlaybook, saveOfficePlaybook } from './api-client';
import { clearAuthSession, setAuthSession } from './auth';

const CFG = { disabledRules: [], severityOverrides: {}, customRules: [] };
const VIEW = { config: CFG, version: 0, updatedAt: null, customized: false, catalog: [], limits: {} };

function mockFetch(status: number, body: unknown) {
  const fn = jest.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

describe('api-client — Playbook المكتب', () => {
  beforeEach(() => {
    clearAuthSession();
    setAuthSession({ access_token: 'tok', refresh_token: 'r', user: { id: 'u', email: 'a@b.c', full_name: null, role: 'user', created_at: '2026-01-01T00:00:00.000Z' } });
  });

  it('GET يرسل التوكن إلى /office-playbook', async () => {
    const f = mockFetch(200, VIEW);
    expect(await fetchOfficePlaybook()).toEqual(VIEW);
    expect(f.mock.calls[0][0]).toMatch(/\/office-playbook$/);
    expect(f.mock.calls[0][1].headers.Authorization).toBe('Bearer tok');
  });

  it('PUT يرسل JSON، وDELETE يعيد الضبط', async () => {
    const f = mockFetch(200, VIEW);
    await saveOfficePlaybook(CFG);
    expect(f.mock.calls[0][1]).toMatchObject({ method: 'PUT', body: JSON.stringify(CFG) });
    expect(f.mock.calls[0][1].headers['Content-Type']).toBe('application/json');
    await resetOfficePlaybook();
    expect(f.mock.calls[1][1]).toMatchObject({ method: 'DELETE' });
  });

  it('400 يعرض رسائل التحقق من الخادم كما هى', async () => {
    mockFetch(400, { message: 'إعداد Playbook غير صالح', errors: ['القاعدة الخاصة رقم 1: العنوان مطلوب', 'قاعدة غير معروفة للتعطيل: x'] });
    await expect(saveOfficePlaybook(CFG)).rejects.toMatchObject({ status: 400, message: 'القاعدة الخاصة رقم 1: العنوان مطلوب\nقاعدة غير معروفة للتعطيل: x' });
  });

  it('401 و429 و500 برسائل عربية، وانقطاع الشبكة status 0', async () => {
    mockFetch(401, {});
    await expect(fetchOfficePlaybook()).rejects.toMatchObject({ status: 401 });
    mockFetch(429, {});
    await expect(fetchOfficePlaybook()).rejects.toMatchObject({ status: 429 });
    mockFetch(500, {});
    await expect(fetchOfficePlaybook()).rejects.toMatchObject({ status: 500, message: expect.stringContaining('HTTP 500') });
    global.fetch = jest.fn().mockRejectedValue(new Error('net')) as unknown as typeof fetch;
    await expect(fetchOfficePlaybook()).rejects.toBeInstanceOf(ApiError);
  });
});
