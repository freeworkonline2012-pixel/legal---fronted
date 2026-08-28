/**
 * عميل API موقّع — نقطة الربط الوحيدة بين الواجهة والخلفية.
 * العقد الكامل للـ API في docs/build/implementation_notes.md (القسم 4)
 * ومصدر الحقيقة: backend/openapi.yaml. الأنواع الموقّعة في src/lib/types.ts — ممنوع any.
 *
 * المصادقة (H-2): يُرفَق Authorization: Bearer تلقائياً عند وجود جلسة (src/lib/auth.ts).
 */

import type {
  ArticleDetail,
  ArticleListResponse,
  AuthResponse,
  CountryListResponse,
  DomainKey,
  FeedbackPayload,
  FeedbackResponse,
  GuidanceDetail,
  GuidanceListResponse,
  LawItem,
  LawListResponse,
  LawStatusKey,
  QuestionAnswerResponse,
  QuestionHistoryResponse,
  QuestionRequest,
  ReviewItem,
  ReviewListResponse,
  ReviewStatus,
  UpdateReviewPayload,
  UserResponse,
} from './types';
import { getAccessToken } from './auth';

export interface ApiHealthResponse {
  status: string;
  service: string;
  timestamp: string;
}

/** خطأ API يحمل كود الحالة — يسمح للمكوّنات بتمييز 401 (غير مصادق) عن غيره */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const API_BASE_URL: string =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api';

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, 'تعذّر الاتصال بالخادم — تحقق من تشغيل الخلفية.');
  }

  if (!res.ok) {
    throw new ApiError(res.status, `فشل طلب الخلفية (HTTP ${res.status})`);
  }
  return (await res.json()) as T;
}

/** GET /api/health — فحص صحة الخلفية */
export async function fetchHealth(): Promise<ApiHealthResponse> {
  return requestJson<ApiHealthResponse>('/health');
}

/** POST /api/questions — إرسال سؤال → إجابة موثّقة + استشهادات + ثقة */
export async function postQuestion(payload: QuestionRequest): Promise<QuestionAnswerResponse> {
  return requestJson<QuestionAnswerResponse>('/questions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** GET /api/questions/history — سجل أسئلة المستخدم (F-15) — عقد {items,total} */
export async function fetchQuestionHistory(): Promise<QuestionHistoryResponse> {
  return requestJson<QuestionHistoryResponse>('/questions/history');
}

/**
 * DELETE /api/questions/{id} — حذف سؤال (مالكه أو admin) — F-14 (151/2020).
 * العقد: backend/openapi.yaml — /questions/{id} delete — يعيد {success:boolean}؛
 * أخطاء: 401 (غير مصادق)، 403 (ليس المالك)، 404 (غير موجود).
 */
export async function deleteQuestion(id: string): Promise<{ success: boolean }> {
  return requestJson<{ success: boolean }>(`/questions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

/** POST /api/feedback — تقييم 👍/👎 (F-08) — يتطلب مصادقة (JwtAuthGuard) */
export async function postFeedback(payload: FeedbackPayload): Promise<FeedbackResponse> {
  return requestJson<FeedbackResponse>('/feedback', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** POST /api/auth/register — إنشاء حساب جديد (H-2).
 * ⚠️ عقد backend الفعلي: الرد UserResponse فقط (بدون توكنات) — التوكنات تُكتسب
 * عبر login تلقائي بعد التسجيل (راجع login/page.tsx). */
export async function registerUser(input: {
  email: string;
  password: string;
  full_name?: string;
}): Promise<UserResponse> {
  return requestJson<UserResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** POST /api/auth/login — تسجيل الدخول (H-2) */
export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return requestJson<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** POST /api/auth/logout — إبطال توكن التحديث (H-2) — يتطلب refresh_token في الجسم */
export async function logoutUser(refreshToken: string): Promise<{ success: boolean }> {
  return requestJson<{ success: boolean }>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

/** GET /api/auth/me — ملف المستخدم الحالي */
export async function fetchMe(): Promise<UserResponse> {
  return requestJson<UserResponse>('/auth/me');
}

/**
 * GET /api/reviews — طابور المراجعة البشرية (EP-06، lawyer/admin فقط).
 * يمرّر status (عادةً 'pending') للطابور القابل للحسم فقط.
 */
export async function fetchReviewQueue(
  status?: ReviewStatus,
  limit = 20,
  offset = 0,
): Promise<ReviewListResponse> {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (status) {
    query.set('status', status);
  }
  return requestJson<ReviewListResponse>(`/reviews?${query.toString()}`);
}

/** PATCH /api/reviews/{id} — حسم مراجعة (EP-06، lawyer/admin فقط) */
export async function resolveReview(
  id: string,
  payload: UpdateReviewPayload,
): Promise<ReviewItem> {
  return requestJson<ReviewItem>(`/reviews/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/* ------------------------------------------------------------------------ */
/* تصفح القوانين والأدلة الإرشادية (أُضيف 2026-08-27) — قراءة عامة، بلا مصادقة */
/* ------------------------------------------------------------------------ */

/** GET /api/laws — تصفح القوانين مع فلترة اختيارية بالمجال/الدولة/الحالة/النوع وترقيم صفحات */
export async function fetchLaws(params?: {
  category?: DomainKey;
  country?: string;
  status?: LawStatusKey;
  /** نوع الأداة التشريعية — قيمة واحدة أو عدة قيم مفصولة بفاصلة (راجع law-kind.ts) */
  kind?: string;
  limit?: number;
  offset?: number;
}): Promise<LawListResponse> {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.country) query.set('country', params.country);
  if (params?.status) query.set('status', params.status);
  if (params?.kind) query.set('kind', params.kind);
  query.set('limit', String(params?.limit ?? 100));
  query.set('offset', String(params?.offset ?? 0));
  return requestJson<LawListResponse>(`/laws?${query.toString()}`);
}

/**
 * GET /api/countries — الدول المستهدفة بالمنصة مع عدد القوانين الفعلى لكل
 * دولة (يُستخدم لبناء "القائمة الرئيسية" فى الشريط الجانبى ولفلترة /laws).
 */
export async function fetchCountries(): Promise<CountryListResponse> {
  return requestJson<CountryListResponse>('/countries');
}

/** GET /api/laws/{id} — تفاصيل قانون واحد */
export async function fetchLaw(id: string): Promise<LawItem> {
  return requestJson<LawItem>(`/laws/${encodeURIComponent(id)}`);
}

/** GET /api/laws/{lawId}/articles — قائمة مواد قانون (مُرتّبة، بلا نص كامل مطوّل) */
export async function fetchArticles(
  lawId: string,
  params?: { limit?: number; offset?: number },
): Promise<ArticleListResponse> {
  const query = new URLSearchParams({
    limit: String(params?.limit ?? 50),
    offset: String(params?.offset ?? 0),
  });
  return requestJson<ArticleListResponse>(
    `/laws/${encodeURIComponent(lawId)}/articles?${query.toString()}`,
  );
}

/** GET /api/laws/{lawId}/articles/{articleNo} — تفاصيل مادة واحدة (مع النسخة السارية) */
export async function fetchArticleDetail(
  lawId: string,
  articleNo: number,
  asOf?: string,
): Promise<ArticleDetail> {
  const query = asOf ? `?as_of=${encodeURIComponent(asOf)}` : '';
  return requestJson<ArticleDetail>(
    `/laws/${encodeURIComponent(lawId)}/articles/${articleNo}${query}`,
  );
}

/** GET /api/guidance — تصفح الأدلة والمنشورات الإرشادية غير المرقّمة */
export async function fetchGuidanceList(params?: {
  category?: DomainKey;
  limit?: number;
  offset?: number;
}): Promise<GuidanceListResponse> {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  query.set('limit', String(params?.limit ?? 100));
  query.set('offset', String(params?.offset ?? 0));
  return requestJson<GuidanceListResponse>(`/guidance?${query.toString()}`);
}

/** GET /api/guidance/{id} — تفاصيل مستند إرشادى واحد (نص كامل) */
export async function fetchGuidanceDetail(id: string): Promise<GuidanceDetail> {
  return requestJson<GuidanceDetail>(`/guidance/${encodeURIComponent(id)}`);
}
