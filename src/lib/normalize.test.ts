import {
  detectDomain,
  getConfidenceKey,
  isDomainKey,
  normalizeArabicDigits,
  stripTashkeel,
} from './normalize';

describe('normalizeArabicDigits', () => {
  it('يحوّل الأرقام الشرقية (٠-٩) إلى غربية (0-9)', () => {
    expect(normalizeArabicDigits('مادة ١١٠')).toBe('مادة 110');
    expect(normalizeArabicDigits('سنة ٢٠٠٣')).toBe('سنة 2003');
  });

  it('يترك الأرقام الغربية كما هي', () => {
    expect(normalizeArabicDigits('مادة 110')).toBe('مادة 110');
  });

  it('يتعامل مع النص الفارغ', () => {
    expect(normalizeArabicDigits('')).toBe('');
  });
});

describe('stripTashkeel', () => {
  it('يزيل التشكيل من النص', () => {
    expect(stripTashkeel('سَارِيَة')).toBe('سارية');
  });
});

describe('getConfidenceKey', () => {
  it('يصنّف الثقة العالية (≥ 0.85)', () => {
    expect(getConfidenceKey(0.92)).toBe('high');
    expect(getConfidenceKey(0.85)).toBe('high');
  });

  it('يصنّف الثقة المتوسطة (0.60 - 0.84)', () => {
    expect(getConfidenceKey(0.7)).toBe('medium');
    expect(getConfidenceKey(0.6)).toBe('medium');
  });

  it('يصنّف الثقة المنخفضة (< 0.60)', () => {
    expect(getConfidenceKey(0.4)).toBe('low');
    expect(getConfidenceKey(0.59)).toBe('low');
  });
});

describe('detectDomain', () => {
  it('يكتشف قانون العمل من سؤال عامي', () => {
    expect(detectDomain('اتنفصلت من الشغل من غير إشعار، ليا حق تعويض؟')).toBe('labor');
  });

  it('يكتشف الإيجارات', () => {
    expect(detectDomain('المالك عايز يطردني من الشقة')).toBe('rent');
  });

  it('يكتشف الأحوال الشخصية', () => {
    expect(detectDomain('النفقة بتتحسب إزاي بعد الطلاق؟')).toBe('personal_status');
  });

  it('يعيد null عند عدم وجود تطابق', () => {
    expect(detectDomain('سؤال غير قانوني تماماً')).toBeNull();
  });
});

describe('isDomainKey', () => {
  it('يقبل كل مفردات backend الثمانية (DOMAIN_KEYS) حرفياً', () => {
    expect(isDomainKey('labor')).toBe(true);
    expect(isDomainKey('rent')).toBe(true);
    expect(isDomainKey('personal_status')).toBe(true);
    expect(isDomainKey('traffic')).toBe(true);
    expect(isDomainKey('consumer_protection')).toBe(true);
    expect(isDomainKey('insurance')).toBe(true);
    expect(isDomainKey('aml_cft')).toBe(true);
    expect(isDomainKey('other')).toBe(true);
  });

  it('يرفض مفردات frontend القديمة (family/consumer، أُزيلت بعد إغلاق فجوة المفردات T-VOCAB-1) دون انهيار', () => {
    expect(isDomainKey('family')).toBe(false);
    expect(isDomainKey('consumer')).toBe(false);
    expect(isDomainKey('not_a_real_domain')).toBe(false);
  });

  it('يرفض القيم غير الصالحة (null / رقم / نص عشوائي)', () => {
    expect(isDomainKey(null)).toBe(false);
    expect(isDomainKey(undefined)).toBe(false);
    expect(isDomainKey(123)).toBe(false);
    expect(isDomainKey('Labor')).toBe(false);
    expect(isDomainKey('')).toBe(false);
  });
});
