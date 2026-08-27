/**
 * تحويلات طابور المراجعة البشرية (EP-06) بين عقد backend وواجهة العرض.
 *
 * ⚠️ backend (ReviewResponseDto) لا يرسل «الأولوية» كمفتاح جاهز للواجهة — يشتقّها
 * mapReviewDomain/reviewPriorityFromConfidence من context.confidence. context.category
 * يبقى نصاً حراً (string | null) فى DTO الخلفية، لذا يبقى isDomainKey ضرورياً كحماية
 * دفاعية: أى قيمة غير معروفة → null (يُعرض «غير محدد» بدل تحطّم DomainChip)، رغم أن
 * DomainKey يطابق backend حرفياً الآن (بعد إغلاق فجوة المفردات T-VOCAB-1 السابقة).
 */

import type { DomainKey, ReviewItem, ReviewQueueItem } from './types';
import { isDomainKey } from './normalize';

/** أولوية عرض داخلية — اشتقاقها من درجة الثقة (عتبات design_tokens.json) */
export type ReviewPriority = ReviewQueueItem['priority'];

/** اشتقاق أولوية عرض العنصر من درجة الثقة الرقمية (backend لا يرسل priority) */
export function reviewPriorityFromConfidence(confidence: number): ReviewPriority {
  if (confidence < 0.6) return 'low_confidence';
  if (confidence < 0.8) return 'medium_confidence';
  return 'daily_sample';
}

/**
 * تطبيع category من backend إلى DomainKey.
 * - قيمة معروفة (تطابق DOMAIN_KEYS) → كما هي.
 * - null أو قيمة غير معروفة → null (عرض دفاعي — لا تحطّم DomainChip).
 */
export function mapReviewDomain(category: string | null | undefined): DomainKey | null {
  if (!category) return null;
  return isDomainKey(category) ? category : null;
}

/**
 * تحويل عنصر backend (ReviewItem) إلى شكل العرض الداخلي (ReviewQueueItem).
 * يُعيد null عندما يكون السياق غائباً (context اختياري في العقد) — العنصر
 * بلا سياق لا يمكن مراجعته من الشاشة، فيُتجاهل بدل عرض بيانات فارغة.
 */
export function mapReviewItem(review: ReviewItem): ReviewQueueItem | null {
  const context = review.context;
  if (!context) return null;
  return {
    id: review.id,
    priority: reviewPriorityFromConfidence(context.confidence),
    domain: mapReviewDomain(context.category),
    question: context.question,
    generated_answer: context.answer,
    source: context.citations[0] ?? null,
    createdAt: review.created_at,
  };
}
