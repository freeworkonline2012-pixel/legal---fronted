/**
 * عقود الأنواع بين الواجهة والخلفية (API Contract v0.1).
 *
 * المصدر الملزم: docs/build/implementation_notes.md — القسم 4 (عقد الـ API).
 * ⚠️ قاعدة ملزمة: لا تُغيَّر هذه الأنواع من طرف واحد — أي تعديل يُسجَّل في
 * implementation_notes.md أولاً بمالك واضح (backend أو ai) ثم يُنفَّذ،
 * وإلا يُعدّ عيب عدم تطابق عقد (Schema Mismatch) من فئة Critical.
 */

/** حالة نفاذ نسخة المادة القانونية — تطابق ArticleVersionResponseDto.status فى backend */
export type LegalStatusKey = 'active' | 'amended' | 'repealed';

/**
 * حالة نفاذ القانون نفسه (مستوى القانون لا المادة) — تطابق LawResponseDto.status
 * فى backend. ⚠️ مفردات مختلفة عمداً عن LegalStatusKey (in_force وليس active) —
 * استخدم mapLawStatusToLegalStatusKey() فى normalize.ts لعرضها عبر StatusBadge.
 */
export type LawStatusKey = 'in_force' | 'amended' | 'repealed';

/** درجة الثقة المصنّفة — تطابق confidence في design_tokens.json */
export type ConfidenceKey = 'high' | 'medium' | 'low';

/**
 * المجالات القانونية — تُطابق DOMAIN_KEYS الفعلية فى backend
 * (src/database/entities/domain-key.ts)، المصدر الوحيد للحقيقة. تحديث 2026-08-27:
 * كانت هذه القائمة تاريخياً (labor/rent/family/traffic/consumer) قبل أن يُغلق
 * فارق المفردات المُوثّق سابقاً باسم T-VOCAB-1 — الآن تطابق backend حرفياً بلا
 * أى تطبيع دفاعى إضافى فى طبقة العرض.
 */
export type DomainKey =
  | 'labor'
  | 'rent'
  | 'personal_status'
  | 'traffic'
  | 'consumer_protection'
  | 'insurance'
  | 'aml_cft'
  | 'legal_profession'
  | 'capital_markets'
  | 'non_bank_finance'
  | 'other';

/** درجة ثقة رقمية بين 0 و 1 (PRD F-06) */
export type ConfidenceScore = number;

/** بطاقة استشهاد واحدة — عقد POST /api/questions → citations[] */
export interface Citation {
  /** اسم القانون، مثال: «قانون العمل» */
  law: string;
  /** رقم القانون، مثال: 12 */
  law_no: number;
  /** سنة الإصدار، مثال: 2003 */
  law_year: number;
  /** رقم المادة، مثال: 110 */
  article_no: number;
  /** حالة النفاذ: سارية / معدّلة / ملغاة */
  status: LegalStatusKey;
  /** تاريخ آخر تعديل بصيغة ISO (أو null إن لم يُعدَّل) */
  last_amended: string | null;
  /**
   * رابط النص الرسمي الكامل (يُفتح في تبويب جديد).
   * ⚠️ nullable في عقد backend (CitationResponseDto.official_url) — تُعرض البطاقة
   * دون زر الرابط عند غياب القيمة (L-1).
   */
  official_url: string | null;
  /** النص الحرفي للمادة (يُعرض بخط legal) */
  snippet: string;
}

/** رد POST /api/questions — الحالة الطبيعية أو الرفض (refused) */
export interface QuestionAnswerResponse {
  /** معرّف الإجابة المحفوظة — يعيده backend في AnswerResponseDto.id (عقد C-2) */
  id: string;
  /** النص المبسّط للإجابة */
  answer: string;
  /** درجة الثقة الرقمية — < 0.60 → رفض صريح + تحويل لمراجعة بشرية */
  confidence: ConfidenceScore;
  citations: Citation[];
  /** true = رفض الإجابة لعدم كفاية النصوص الموثّقة */
  refused: boolean;
}

/** طلب POST /api/questions */
export interface QuestionRequest {
  question: string;
  /** اختياري — للأسئلة المتتابعة (F-11) */
  conversation_id?: string;
}

/** عنصر واحد في سجل «أسئلتي» (GET /api/questions/history — F-15) */
export interface QuestionHistoryItem {
  id: string;
  question: string;
  /**
   * المجال القانوني المصنّف — يطابق عمود/حقل backend `category` (وليست domain).
   * قد يكون null قبل التصنيف.
   */
  category: DomainKey | null;
  /** true = رفض صريح (لا تخمين) — يطابق حقل backend `refused` (وليس status) */
  refused: boolean;
  confidence: ConfidenceScore | null;
  created_at: string;
}

/** رد GET /api/questions/history — مصفوفة مُغلَّفة {items,total} (عقد backend C-1) */
export interface QuestionHistoryResponse {
  items: QuestionHistoryItem[];
  total: number;
}

/**
 * طلب تقييم 👍/👎 (POST /api/feedback — F-08) — عقد backend مُثبَّت (C-2):
 * `{ answer_id, rating: 1|-1, comment? }` مع Authorization: Bearer.
 */
export interface FeedbackPayload {
  /** معرّف الإجابة المحفوظة — يأتي من حقل id الجديد في رد POST /api/questions */
  answer_id: string;
  /** 1 = 👍 ، -1 = 👎 */
  rating: 1 | -1;
  /** اختياري — يظهر عند اختيار 👎 («ما الخطأ؟») */
  comment?: string;
}

/** رد POST /api/feedback — يطابق FeedbackResponseDto في backend */
export interface FeedbackResponse {
  id: string;
  answer_id: string;
  rating: 1 | -1;
  comment: string | null;
  created_at: string;
}

/** دور المستخدم — يطابق UserRole في backend (user/lawyer/admin) */
export type UserRole = 'user' | 'lawyer' | 'admin';

/** ملف المستخدم — يطابق UserResponseDto */
export interface UserResponse {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

/** رد POST /api/auth/register|login — يطابق AuthResponseDto */
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: UserResponse;
}

/** عنصر في طابور المراجعة البشرية (EP-06 — واجهة المحامي S-09) */
export interface ReviewQueueItem {
  id: string;
  priority: 'low_confidence' | 'daily_sample' | 'medium_confidence';
  /**
   * المجال القانوني — قد يكون null عندما لا يُصنَّف السؤال بعد.
   * ملاحظة (مُحدَّثة بعد إغلاق T-VOCAB-1 في backend جولة 18): عقد ReviewDetailContext
   * في openapi.yaml ما يزال يصرّح category بـ LawCategory الأوسع
   * (labor/rent/personal_status/traffic/consumer_protection/other) وليس DomainKey —
   * لذلك يبقى التطبيع الدفاعي في review.ts (mapReviewDomain) ضرورياً: personal_status→family
   * وconsumer_protection→consumer، وأي قيمة خارج DomainKey تُعرض «غير محدد» بدل تحطّم.
   */
  domain: DomainKey | null;
  question: string;
  generated_answer: string;
  source: Citation | null;
  createdAt: string;
}

/** حالة مراجعة — يطابق ReviewResponseDto.status في backend (EP-06) */
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'needs_changes';

/** حالات الحسم المسموحة في PATCH /api/reviews/{id} — يطابق UpdateReviewDto */
export type ReviewResolveStatus = 'approved' | 'rejected' | 'needs_changes';

/** سياق المراجعة (EP-06): السؤال + الإجابة + الثقة + الاستشهادات — يطابق ReviewDetailContextDto */
export interface ReviewContext {
  question: string;
  answer: string;
  confidence: number;
  category: string | null;
  citations: Citation[];
}

/** عنصر طابور مراجعة من backend — يطابق ReviewResponseDto (GET/PATCH /api/reviews) */
export interface ReviewItem {
  id: string;
  answer_id: string;
  reviewer_id: string | null;
  status: ReviewStatus;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  context?: ReviewContext;
}

/** رد GET /api/reviews — مصفوفة مُغلَّفة {items,total} */
export interface ReviewListResponse {
  items: ReviewItem[];
  total: number;
}

/** جسم PATCH /api/reviews/{id} — يطابق UpdateReviewDto */
export interface UpdateReviewPayload {
  status: ReviewResolveStatus;
  review_note?: string;
}

/** أنواع إشعارات Toast (component_states.md القسم 11) */
export type ToastKind = 'success' | 'error' | 'info';

/* ------------------------------------------------------------------------ */
/* تصفح القوانين والأدلة الإرشادية (أُضيف 2026-08-27) — يطابق backend حرفياً:  */
/* LawResponseDto / ArticleResponseDto / GuidanceListItemDto وما إليها.       */
/* ------------------------------------------------------------------------ */

/** عنصر قانون — يطابق LawResponseDto */
export interface LawItem {
  id: string;
  law_no: number;
  law_year: number;
  title: string;
  short_title: string | null;
  /** نص حر من backend (قد يقع خارج DomainKey فى حالات نادرة) — استخدم isDomainKey للعرض الآمن */
  category: string;
  /**
   * نوع الأداة التشريعية (law/pm_decision/ministerial_decision/board_decision/
   * circular/regulation/other) — يطابق law-kind.ts (T-VOCAB-2) فى backend،
   * أُضيف 2026-08-28 لدعم صفحتى /decisions و/regulations. نص حر هنا عمداً
   * (بلا union مضبوط) لنفس سبب category أعلاه.
   */
  kind: string;
  /** ISO 3166-1 alpha-2 — راجع CountryItem */
  country_code: string;
  status: LawStatusKey;
  official_url: string | null;
  enacted_at: string | null;
  last_amended_at: string | null;
  created_at: string;
  updated_at: string;
}

/** رد GET /api/laws — {items,total} */
export interface LawListResponse {
  items: LawItem[];
  total: number;
}

/** عنصر دولة — يطابق CountryResponseDto (GET /api/countries) */
export interface CountryItem {
  code: string;
  name_ar: string;
  name_en: string | null;
  display_order: number;
  is_active: boolean;
  /** عدد القوانين الفعلى المُدخَل لهذه الدولة — 0 يعنى "قريباً" */
  law_count: number;
}

/** رد GET /api/countries — {items} */
export interface CountryListResponse {
  items: CountryItem[];
}

/** نسخة مادة قانونية — تطابق ArticleVersionResponseDto */
export interface ArticleVersion {
  id: string;
  version_no: number;
  body: string;
  effective_from: string;
  effective_to: string | null;
  status: LegalStatusKey;
  amended_by_law_no: number | null;
  amended_by_law_year: number | null;
  change_note: string | null;
  created_at: string;
}

/** عنصر مادة فى قائمة مواد قانون — يطابق ArticleResponseDto */
export interface ArticleItem {
  id: string;
  law_id: string;
  article_no: number;
  hierarchical_location: string | null;
  title: string | null;
  body: string;
  plain_summary: string | null;
  created_at: string;
  updated_at: string;
}

/** رد GET /api/laws/:lawId/articles — {items,total} */
export interface ArticleListResponse {
  items: ArticleItem[];
  total: number;
}

/** تفاصيل مادة واحدة (GET /api/laws/:lawId/articles/:articleNo) — يطابق ArticleDetailResponseDto */
export interface ArticleDetail extends ArticleItem {
  version: ArticleVersion;
}

/** ملخّص القانون المرتبط بمستند إرشادى — يطابق RelatedLawSummaryDto */
export interface RelatedLawSummary {
  id: string;
  law_no: number;
  law_year: number;
  title: string;
}

/** عنصر فى قائمة الأدلة الإرشادية — يطابق GuidanceListItemDto */
export interface GuidanceListItem {
  id: string;
  title: string;
  issuing_authority: string | null;
  category: string;
  official_url: string | null;
  issued_at: string | null;
  related_law: RelatedLawSummary | null;
  created_at: string;
}

/** رد GET /api/guidance — {items,total} */
export interface GuidanceListResponse {
  items: GuidanceListItem[];
  total: number;
}

/** تفاصيل مستند إرشادى واحد — يطابق GuidanceDetailResponseDto */
export interface GuidanceDetail extends GuidanceListItem {
  quality_note: string | null;
  plain_summary: string | null;
  body: string;
  updated_at: string;
}
