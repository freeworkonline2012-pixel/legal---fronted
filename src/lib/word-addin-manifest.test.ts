import { ADDIN_ID, buildManifest, safeOrigin } from './word-addin-manifest';

describe('word-addin-manifest', () => {
  it('safeOrigin: https بنطاق صالح أو localhost فقط؛ ينظّف المسار ويرفض الباقى', () => {
    expect(safeOrigin('https://legal.example.com/path?x=1')).toBe('https://legal.example.com');
    expect(safeOrigin('https://legal-app.vercel.app')).toBe('https://legal-app.vercel.app');
    expect(safeOrigin('http://localhost:3000')).toBe('http://localhost:3000');
    expect(safeOrigin('http://evil.com')).toBeNull();
    expect(safeOrigin('https://evil.com"><x/>')).toBeNull();
    expect(safeOrigin('javascript:alert(1)')).toBeNull();
    expect(safeOrigin('https://localhost')).toBeNull();
    expect(safeOrigin('https://a b.com')).toBeNull();
    expect(safeOrigin('')).toBeNull();
    expect(safeOrigin(null)).toBeNull();
    expect(safeOrigin('not a url')).toBeNull();
  });

  it('buildManifest: XML سليم البنية بالروابط الصحيحة ومتطلبات التعليقات وصلاحية القراءة والكتابة', () => {
    const xml = buildManifest('https://legal.example.com');
    expect(xml.startsWith('<?xml')).toBe(true);
    expect(xml).toContain(`<Id>${ADDIN_ID}</Id>`);
    expect(xml).toContain('<SourceLocation DefaultValue="https://legal.example.com/word-addin"/>');
    expect(xml).toContain('<AppDomain>https://legal.example.com</AppDomain>');
    expect(xml).toContain('<Set Name="WordApi" MinVersion="1.4"/>');
    expect(xml).toContain('<Permissions>ReadWriteDocument</Permissions>');
    expect(xml).toContain('https://legal.example.com/word-addin/icon-80.png');
    expect(xml).not.toContain('localhost');
    // كل resid مستخدم معرَّف فى Resources
    const used = [...xml.matchAll(/resid="([^"]+)"/g)].map((m) => m[1]);
    const defined = new Set([...xml.matchAll(/<bt:(?:Image|Url|String) id="([^"]+)"/g)].map((m) => m[1]));
    expect(used.length).toBeGreaterThan(5);
    for (const r of used) expect(defined.has(r)).toBe(true);
    // أقواس متوازنة: كل وسم يُفتح يُغلق
    expect((xml.match(/<OfficeApp/g) ?? []).length).toBe(1);
    expect((xml.match(/<\/OfficeApp>/g) ?? []).length).toBe(1);
  });

  it('buildManifest يرفض أصلاً غير صالح، ويُسقط أى مسار/وسوم تُلحَق بالأصل فلا تدخل XML', () => {
    expect(() => buildManifest('http://example.com')).toThrow();
    expect(() => buildManifest('javascript:alert(1)')).toThrow();
    const xml = buildManifest('https://legal.example.com/"><x/>');
    expect(xml).not.toContain('<x/>');
    expect(xml).toContain('https://legal.example.com/word-addin');
  });
});
