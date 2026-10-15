import {
  initialReview,
  redactionSummary,
  toClarificationAnswers,
  validateDocumentFile,
  MAX_DOCUMENT_BYTES,
} from './document-facts';

describe('validateDocumentFile', () => {
  it('يقبل الأنواع المدعومة بحجم سليم', () => {
    for (const name of ['a.pdf', 'a.DOCX', 'a.png', 'a.jpg', 'a.jpeg']) {
      expect(validateDocumentFile({ name, size: 1000 })).toBeUndefined();
    }
  });
  it('يرفض النوع غير المدعوم والفارغ والكبير', () => {
    expect(validateDocumentFile({ name: 'a.exe', size: 10 })).toMatch(/غير مدعوم/);
    expect(validateDocumentFile({ name: 'a.pdf', size: 0 })).toMatch(/فارغ/);
    expect(validateDocumentFile({ name: 'a.pdf', size: MAX_DOCUMENT_BYTES + 1 })).toMatch(/أكبر/);
  });
});

describe('toClarificationAnswers', () => {
  const facts = [
    { label: 'الأجر الشهرى', value: '5000 جنيه', quote: 'الأجر الشهرى 5000 جنيه' },
    { label: 'مدة العقد', value: 'سنة', quote: 'مدة العقد سنة' },
  ];
  it('يحوّل المعتمد فقط إلى إجابات custom بقيم معدّلة', () => {
    const review = initialReview(facts);
    review[1].included = false;
    review[0].value = '  6000   جنيه ';
    expect(toClarificationAnswers(review)).toEqual([
      { question: 'الأجر الشهرى (من المستند)', answer: '6000 جنيه', kind: 'custom' },
    ]);
  });
  it('يستبعد القيمة الفارغة ويقصّ الطويلة', () => {
    const review = initialReview(facts);
    review[0].value = '   ';
    review[1].value = 'س'.repeat(500);
    const out = toClarificationAnswers(review);
    expect(out).toHaveLength(1);
    expect(out[0].answer).toHaveLength(300);
  });
});

describe('redactionSummary', () => {
  it('يلخص المحجوب ويتجاهل الأصفار', () => {
    expect(redactionSummary({ national_id: 2, phone: 1, email: 0 })).toBe('2 أرقام قومية، 1 هواتف');
    expect(redactionSummary({})).toBe('');
  });
});
