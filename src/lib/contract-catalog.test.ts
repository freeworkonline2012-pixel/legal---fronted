import { CATALOG, catalogSize, normalizeArabic, searchCatalog } from './contract-catalog';

describe('contract-catalog', () => {
  it('كل صيغة ≤ 60 حرفاً (حد الخادم) وبلا تكرار داخل التصنيف ولا تصنيف فارغ', () => {
    for (const c of CATALOG) {
      expect(c.forms.length).toBeGreaterThan(0);
      const titles = c.forms.map((f) => f.title);
      expect(new Set(titles).size).toBe(titles.length);
      for (const t of titles) {
        expect(t.length).toBeLessThanOrEqual(60);
        expect(t.trim()).toBe(t);
      }
    }
  });

  it('لا تكرار للصيغة عبر التصنيفات', () => {
    const all = CATALOG.flatMap((c) => c.forms.map((f) => f.title));
    expect(new Set(all).size).toBe(all.length);
    expect(catalogSize()).toBe(all.length);
  });

  it('القوالب الثابتة الثلاثة مرتبطة بأنواعها والباقى «عقد آخر»', () => {
    const all = CATALOG.flatMap((c) => c.forms);
    expect(all.filter((f) => f.kind === 'lease').map((f) => f.title)).toEqual(['عقد إيجار']);
    expect(all.filter((f) => f.kind === 'nda')).toHaveLength(1);
    expect(all.filter((f) => f.kind === 'services')).toHaveLength(1);
    expect(all.filter((f) => f.kind === 'custom').length).toBe(all.length - 3);
  });

  it('لا تدخل عقود الزواج ولا الوصية فى الفهرس', () => {
    const all = CATALOG.flatMap((c) => c.forms.map((f) => f.title)).join(' ');
    expect(all).not.toMatch(/عقد زواج|عقد وصية/);
  });

  it('التطبيع والبحث: همزات وياء وتاء مربوطة وكلمات متفرقة', () => {
    expect(normalizeArabic('إيجــار سيارة')).toBe(normalizeArabic('ايجار سياره'));
    const any = () => true;
    expect(searchCatalog('ايجار سياره', any).map((h) => h.title)).toContain('عقد إيجار سيارة');
    expect(searchCatalog('', any)).toEqual([]);
    expect(searchCatalog('عقود البيع شقه', any).length).toBeGreaterThan(0);
    expect(searchCatalog('بيع شقه', (k) => k !== 'custom')).toEqual([]);
  });
});
