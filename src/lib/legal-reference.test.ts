import { pageRangeLabel, referenceTypeLabel, splitSnippet } from './legal-reference';

describe('splitSnippet', () => {
  it('يفصل مواضع التطابق ويحافظ على باقى النص بترتيبه', () => {
    expect(splitSnippet('يعرف [[عقد]] [[العمل]] بانه اتفاق')).toEqual([
      { text: 'يعرف ', match: false },
      { text: 'عقد', match: true },
      { text: ' ', match: false },
      { text: 'العمل', match: true },
      { text: ' بانه اتفاق', match: false },
    ]);
  });

  it('نص بلا تطابقات يعود جزءاً واحداً، ونص فارغ يعود قائمة فارغة', () => {
    expect(splitSnippet('نص عادى')).toEqual([{ text: 'نص عادى', match: false }]);
    expect(splitSnippet('')).toEqual([]);
  });

  it('لا يفسّر HTML — يعيده نصاً حرفياً (لا حقن)', () => {
    const parts = splitSnippet('<img src=x onerror=alert(1)> [[كلمة]]');
    expect(parts[0]).toEqual({ text: '<img src=x onerror=alert(1)> ', match: false });
    expect(parts[1]).toEqual({ text: 'كلمة', match: true });
  });
});

describe('pageRangeLabel', () => {
  it('يصوغ نطاقاً أو صفحة واحدة أو لا شىء', () => {
    expect(pageRangeLabel(11, 20)).toBe('ص 11–20');
    expect(pageRangeLabel(5, 5)).toBe('ص 5');
    expect(pageRangeLabel(5, null)).toBe('ص 5');
    expect(pageRangeLabel(null, 7)).toBe('ص 7');
    expect(pageRangeLabel(null, null)).toBeNull();
  });
});

describe('referenceTypeLabel', () => {
  it('يعيد التسمية العربية، ونوعاً مجهولاً يعود "أخرى"', () => {
    expect(referenceTypeLabel('fiqh')).toBe('فقه');
    expect(referenceTypeLabel('zzz')).toBe('أخرى');
  });
});
