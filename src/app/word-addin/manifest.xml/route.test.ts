/** @jest-environment node */
import { GET } from './route';

describe('GET /word-addin/manifest.xml', () => {
  const OLD = process.env.NEXT_PUBLIC_SITE_URL;
  afterEach(() => {
    if (OLD === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = OLD;
  });

  it('يولّد المانيفست من أصل الطلب مع ترويسات تنزيل وعدم تخزين', async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const res = GET(new Request('https://legal.example.com/word-addin/manifest.xml'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/xml');
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.text()).toContain('https://legal.example.com/word-addin');
  });

  it('NEXT_PUBLIC_SITE_URL له الأولوية (أصل موثوق)', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://prod.example.org';
    const res = GET(new Request('https://preview-123.vercel.app/word-addin/manifest.xml'));
    const xml = await res.text();
    expect(xml).toContain('https://prod.example.org/word-addin');
    expect(xml).not.toContain('preview-123');
  });

  it('أصل غير صالح (http غير localhost) ⇒ 500 بلا مانيفست', async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const res = GET(new Request('http://internal-host/word-addin/manifest.xml'));
    expect(res.status).toBe(500);
  });
});
