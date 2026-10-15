import {
  MAX_TRANSLATION_BYTES,
  directionLabel,
  dirFor,
  flagLabels,
  progressPercent,
  validateTranslationFile,
} from './translation';

describe('validateTranslationFile', () => {
  it('يقبل PDF وDOCX والصور', () => {
    for (const name of ['a.pdf', 'b.DOCX', 'c.png', 'd.jpg', 'e.jpeg']) {
      expect(validateTranslationFile({ name, size: 1000 })).toBeUndefined();
    }
  });
  it('يرفض النوع غير المدعوم والفارغ والكبير', () => {
    expect(validateTranslationFile({ name: 'a.exe', size: 10 })).toMatch(/غير مدعوم/);
    expect(validateTranslationFile({ name: 'a.pdf', size: 0 })).toMatch(/فارغ/);
    expect(validateTranslationFile({ name: 'a.pdf', size: MAX_TRANSLATION_BYTES + 1 })).toMatch(/10 ميغابايت/);
  });
});

describe('progress and labels', () => {
  const base = { status: 'translating' as const };
  it('لا يبلغ 100 قبل الاكتمال', () => {
    expect(progressPercent({ ...base, progress: { done_units: 29, total_units: 29, done_batches: 1, total_batches: 1 } })).toBe(99);
    expect(progressPercent({ ...base, progress: { done_units: 0, total_units: 0, done_batches: 0, total_batches: 0 } })).toBe(0);
    expect(progressPercent({ status: 'completed', progress: { done_units: 1, total_units: 2, done_batches: 1, total_batches: 1 } })).toBe(100);
    expect(progressPercent({ ...base, progress: { done_units: 10, total_units: 40, done_batches: 1, total_batches: 4 } })).toBe(25);
  });
  it('الاتجاه والتسميات', () => {
    expect(dirFor('ar')).toBe('rtl');
    expect(dirFor('en')).toBe('ltr');
    expect(directionLabel('ar', 'en')).toBe('من العربية إلى الإنجليزية');
    expect(flagLabels(['numbers_mismatch'])[0]).toMatch(/الأرقام/);
  });
});
