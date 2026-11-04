import { uploadContract } from './api-client';
import { clearAuthSession, setAuthSession } from './auth';

const FILE = new File([new Uint8Array([1, 2, 3])], 'c.pdf', { type: 'application/pdf' });
function mockFetch(status: number, body: unknown) {
  const fn = jest.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

describe('uploadContract', () => {
  beforeEach(() => {
    clearAuthSession();
    setAuthSession({
      access_token: 'tok',
      refresh_token: 'r',
      user: { id: 'u', email: 'u@e.com', full_name: null, role: 'user', created_at: '2026-01-01T00:00:00.000Z' },
    });
  });

  it('بلا خيارات: لا حقل background (السلوك القديم)', async () => {
    const fn = mockFetch(201, { id: 'c', status: 'processed' });
    await uploadContract(FILE, null);
    expect((fn.mock.calls[0][1].body as FormData).get('background')).toBeNull();
  });

  it('background: يُرسل الحقل مع الملف ومركز العميل', async () => {
    const fn = mockFetch(201, { id: 'c', status: 'processing' });
    await uploadContract(FILE, { contract_type: 'عقد إيجار', client_role: 'مستأجر', client_party: 'second' }, { background: true });
    const form = fn.mock.calls[0][1].body as FormData;
    expect(form.get('background')).toBe('true');
    expect(form.get('client_role')).toBe('مستأجر');
    expect((form.get('file') as File).name).toBe('c.pdf');
  });
});
