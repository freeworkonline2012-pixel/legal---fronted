/**
 * بيانات تجريبية (Demo Data) للعرض والتطوير والاختبارات.
 *
 * ⚠️ هذه ليست بيانات قانونية حقيقية معتمدة — تُستخدم فقط لمعاينة الواجهة
 * (مثال الهبوط P8) ولاختبارات Jest. المصدر القانوني الفعلي يأتي من
 * data/raw/* (وكيل legal) عبر خط التجميع backend (EP-02) ثم API.
 */

import type {
  Citation,
  DomainKey,
  QuestionAnswerResponse,
  QuestionHistoryItem,
  ReviewQueueItem,
} from './types';

export const DEMO_CITATION: Citation = {
  law: 'قانون العمل',
  law_no: 12,
  law_year: 2003,
  article_no: 110,
  status: 'active',
  last_amended: '2019-06-15',
  official_url: 'https://elpai.idsc.gov.eg/',
  snippet:
    'إذا أنهي عقد العمل من جانب صاحب العمل لغير الأسباب المصرح بها في هذا القانون، أو بغير مراعاة المهلة المحددة في المادة (109) أو الإجراءات المقررة فيها، كان للعامل الحق في تعويض عن عدم الإخطار، أو عن الفصل التعسفي، بحسب الأحوال.',
};

export const DEMO_ANSWER: QuestionAnswerResponse = {
  id: 'a-demo-answer',
  answer:
    'نعم، لك حق في تعويض عن إنهاء عقد العمل دون إشعار، وفقاً للمادة 110 من قانون العمل رقم 12 لسنة 2003.',
  confidence: 0.92,
  citations: [DEMO_CITATION],
  refused: false,
};

export const DEMO_REFUSAL: QuestionAnswerResponse = {
  id: 'a-demo-refusal',
  answer:
    'لم نجد نصاً قانونياً كافياً وموثّقاً للإجابة بدقة — ولن نخمّن. هذا الموقف خارج نطاق المجالات المغطاة حالياً (عمل/إيجارات/أحوال شخصية/مرور/حماية مستهلك).',
  confidence: 0.4,
  citations: [],
  refused: true,
};

export interface SuggestedQuestion {
  id: string;
  domain: DomainKey;
  text: string;
}

export const DEMO_SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  { id: 'sq-1', domain: 'labor', text: 'اتنفصلت من الشغل من غير إشعار، ليا حق تعويض؟' },
  { id: 'sq-2', domain: 'rent', text: 'المالك عايز يطردني من غير سبب… حقي إيه؟' },
  { id: 'sq-3', domain: 'personal_status', text: 'النفقة بتتحسب إزاي بعد الطلاق؟' },
  { id: 'sq-4', domain: 'traffic', text: 'مخالفة السرعة الزايدة عليها غرامة كام؟' },
];

export const DEMO_HISTORY: QuestionHistoryItem[] = [
  {
    id: 'q-1001',
    question: 'اتنفصلت من الشغل من غير إشعار، ليا حق تعويض؟',
    category: 'labor',
    refused: false,
    confidence: 0.92,
    created_at: '2026-08-17T10:24:00.000Z',
  },
  {
    id: 'q-1002',
    question: 'إيه حكم الشركة اللي بتشتغل في السوشيال ميديا؟',
    category: null,
    refused: true,
    confidence: 0.4,
    created_at: '2026-08-17T09:10:00.000Z',
  },
];

export const DEMO_REVIEW_ITEMS: ReviewQueueItem[] = [
  {
    id: '1024',
    priority: 'low_confidence',
    domain: 'labor',
    question: 'اتنفصلت من الشغل من غير إشعار، ليا حق تعويض؟',
    generated_answer:
      'نعم، لك حق في تعويض عن إنهاء عقد العمل دون إشعار، وفقاً للمادة 110 من قانون العمل رقم 12 لسنة 2003.',
    source: DEMO_CITATION,
    createdAt: '2026-08-17T08:00:00.000Z',
  },
  {
    id: '1023',
    priority: 'daily_sample',
    domain: 'rent',
    question: 'المالك رفع إخلاء… إيه الإجراءات؟',
    generated_answer:
      'يتولى قاضي الأمور المستعجلة نظر دعاوى الإخلاء وفقاً لأحكام قانون الإيجارات.',
    source: null,
    createdAt: '2026-08-17T07:30:00.000Z',
  },
];
