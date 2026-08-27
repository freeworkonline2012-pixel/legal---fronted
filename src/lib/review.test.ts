/**
 * اختبارات تحويلات طابور المراجعة (EP-06) — src/lib/review.ts
 *
 * تغطي:
 * - اشتقاق الأولوية من درجة الثقة (عتبات 0.6 / 0.8).
 * - تطبيع category من backend (personal_status → family، consumer_protection →
 *   consumer، null/غير معروف → null — عرض دفاعي بلا تحطّم).
 * - تحويل ReviewItem كاملاً إلى ReviewQueueItem، والرفض الآمن عند غياب السياق.
 */

import {
  mapReviewDomain,
  mapReviewItem,
  reviewPriorityFromConfidence,
} from './review';
import type { ReviewItem } from './types';

describe('reviewPriorityFromConfidence', () => {
  it('يصنّف الثقة المنخفضة (< 0.6) كأولوية منخفضة — خط الدفاع الأول', () => {
    expect(reviewPriorityFromConfidence(0.59)).toBe('low_confidence');
    expect(reviewPriorityFromConfidence(0.4)).toBe('low_confidence');
  });

  it('يصنّف الثقة المتوسطة (0.6 - 0.79) كأولوية متوسطة', () => {
    expect(reviewPriorityFromConfidence(0.6)).toBe('medium_confidence');
    expect(reviewPriorityFromConfidence(0.79)).toBe('medium_confidence');
  });

  it('يصنّف الثقة العالية (>= 0.8) كعينة يومية', () => {
    expect(reviewPriorityFromConfidence(0.8)).toBe('daily_sample');
    expect(reviewPriorityFromConfidence(0.95)).toBe('daily_sample');
  });
});

describe('mapReviewDomain', () => {
  it('يبقي مفردات DomainKey كما هي', () => {
    expect(mapReviewDomain('labor')).toBe('labor');
    expect(mapReviewDomain('traffic')).toBe('traffic');
  });

  it('يبقي مفردات backend الحديثة (personal_status/consumer_protection) كما هى — تطابق DomainKey حرفياً الآن', () => {
    expect(mapReviewDomain('personal_status')).toBe('personal_status');
    expect(mapReviewDomain('consumer_protection')).toBe('consumer_protection');
  });

  it('يعيد null عند غياب التصنيف أو قيمة غير معروفة (عرض دفاعي بلا تحطّم)', () => {
    expect(mapReviewDomain(null)).toBeNull();
    expect(mapReviewDomain(undefined)).toBeNull();
    expect(mapReviewDomain('unknown_vocab')).toBeNull();
  });
});

describe('mapReviewItem', () => {
  const baseReview: ReviewItem = {
    id: 'r-1',
    answer_id: 'a-1',
    reviewer_id: null,
    status: 'pending',
    review_note: null,
    reviewed_at: null,
    created_at: '2026-08-17T08:00:00.000Z',
    context: {
      question: 'هل يحق فصلي بدون إنذار؟',
      answer: 'طبقاً للمادة 110 من قانون العمل...',
      confidence: 0.87,
      category: 'labor',
      citations: [
        {
          law: 'قانون العمل',
          law_no: 12,
          law_year: 2003,
          article_no: 110,
          status: 'active',
          last_amended: null,
          official_url: 'https://example.gov.eg',
          snippet: 'إذا أنهي عقد العمل...',
        },
      ],
    },
  };

  it('يحوّل عنصراً كاملاً إلى شكل العرض مع المصدر الأول كاستشهاد', () => {
    const mapped = mapReviewItem(baseReview);
    expect(mapped).not.toBeNull();
    expect(mapped?.id).toBe('r-1');
    expect(mapped?.priority).toBe('daily_sample'); // 0.87 >= 0.8
    expect(mapped?.domain).toBe('labor');
    expect(mapped?.question).toBe('هل يحق فصلي بدون إنذار؟');
    expect(mapped?.source?.article_no).toBe(110);
  });

  it('يعيد null عندما يكون السياق غائباً (لا يُعرض عنصر بلا سياق)', () => {
    const withoutContext: ReviewItem = { ...baseReview, context: undefined };
    expect(mapReviewItem(withoutContext)).toBeNull();
  });

  it('يحدد source = null عندما لا توجد استشهادات', () => {
    const noCitations: ReviewItem = {
      ...baseReview,
      context: { ...baseReview.context!, citations: [] },
    };
    const mapped = mapReviewItem(noCitations);
    expect(mapped?.source).toBeNull();
  });
});
