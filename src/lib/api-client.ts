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
  ContractResponse,
  CountryListResponse,
  DomainKey,
  FeedbackPayload,
  FeedbackResponse,
  GovernanceAssessRequest,
  GovernanceAssessResponse,
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

/* ------------------------------------------------------------------------ */
/* خدمة الحوكمة والالتزام والمخاطر (أُضيف 2026-09-05) — قراءة عامة، مصادقة    */
/* اختيارية (OptionalJwtAuthGuard فى backend، لا تسجيل دخول إلزامى).          */
/* ------------------------------------------------------------------------ */

/**
 * POST /api/governance/assess — تقييم مطابقة إجراء/قرار مع قوانين ولوائح
 * الحوكمة والالتزام والمخاطر المفهرَسة (مكافحة غسل أموال/تمويل إرهاب، تأمين،
 * تمويل غير مصرفى). ⚠️ دقة هذه الخدمة قيد التحقق الفعلى — راجع تنبيه الواجهة.
 */
export async function postGovernanceAssess(
  payload: GovernanceAssessRequest,
): Promise<GovernanceAssessResponse> {
  return requestJson<GovernanceAssessResponse>('/governance/assess', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/* ------------------------------------------------------------------------ */
/* خدمة المدقق القانونى للعقود (Service 2، أُضيف 2026-09-05) — مصادقة        */
/* إلزامية (JwtAuthGuard فى backend، بخلاف كل الخدمات أعلاه) — بيانات عقود   */
/* عمل حقيقية للمستخدم، لا مسار مجهول الهوية هنا.                            */
/* ------------------------------------------------------------------------ */

/**
 * POST /api/contracts — رفع عقد (PDF/DOCX) لاستخراج بنوده وتقييمها الأولى.
 *
 * ⚠️ لا تستخدم requestJson هنا: الجسم FormData (multipart/form-data) لا JSON،
 * ويجب **عدم** تعيين رأس Content-Type يدوياً — المتصفح يحسب حدّ الفصل
 * (boundary) الصحيح تلقائياً فقط عند ترك الرأس للمتصفح؛ تعيينه صراحة (كما
 * تفعل requestJson لـ 'application/json') يُفسد الطلب بالكامل فى الخلفية
 * (NestJS/multer يفشل فى تحليل الجسم إن غاب الـboundary الصحيح).
 *
 * 401 متوقَّع دائماً بلا جلسة (مصادقة إلزامية) — المكوّن المستدعى مسؤول عن
 * التحقق من isAuthenticated() قبل عرض نموذج الرفع أصلاً (راجع ContractsScreen).
 */
export async function uploadContract(file: File): Promise<ContractResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/contracts`, {
      method: 'POST',
      headers,
      body: formData,
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, 'تعذّر الاتصال بالخادم — تحقق من اتصالك وحاول مرة أخرى.');
  }

  if (!res.ok) {
    // رسالة الخلفية (مثال: "نوع ملف غير مدعوم") أدق من نص عام — تُقرأ إن أمكن.
    let detail: string | undefined;
    try {
      const body = (await res.json()) as { message?: string };
      detail = typeof body.message === 'string' ? body.message : undefined;
    } catch {
      // جسم غير JSON — نتجاهله ونستخدم رسالة عامة أدناه.
    }
    throw new ApiError(res.status, detail ?? `فشل رفع العقد (HTTP ${res.status})`);
  }

  return (await res.json()) as ContractResponse;
}

/** GET /api/contracts/{id} — حالة عقد وبنوده وتقييمها (401 بلا جلسة، 403 لغير المالك، 404 لعقد غير موجود) */
export async function fetchContract(id: string): Promise<ContractResponse> {
  return requestJson<ContractResponse>(`/contracts/${encodeURIComponent(id)}`);
}

/* ------------------------------------------------------------------------ */
/* تنزيل الإجابات والتقارير كمستندات PDF/Word (الهجرة 203 فى الخلفية)         */
/* المستند يُبنى على الخادم من سجل مملوك للمستخدم — لا يُرسَل نص من المتصفح.   */
/* ------------------------------------------------------------------------ */

export type ExportKind = 'answers' | 'governance' | 'contracts';
export type ExportFormat = 'pdf' | 'docx';

const EXPORT_FALLBACK_NAMES: Record<ExportFormat, string> = {
  pdf: 'document.pdf',
  docx: 'document.docx',
};

/** يستخرج اسم الملف من Content-Disposition (ASCII فقط من الخادم) أو يعيد null */
export function parseDownloadFilename(header: string | null): string | null {
  if (!header) return null;
  // مُرسَّخ بنهاية القيمة: أى رمز غير [A-Za-z0-9._-] (مثل «/») يُبطل المطابقة كلها.
  const match = /filename="?([A-Za-z0-9._-]+)"?\s*(?:;|$)/.exec(header);
  if (!match || match[1].includes('..')) return null;
  return match[1];
}

/** رسالة عربية مفهومة لكل حالة فشل متوقعة فى التنزيل */
function exportErrorMessage(status: number, backendMessage: string | undefined, format: ExportFormat): string {
  if (status === 401) return 'سجّل الدخول أولاً لتنزيل المستند.';
  if (status === 404) return 'تعذّر العثور على هذا المستند ضمن حسابك.';
  if (status === 409 && backendMessage) return backendMessage;
  if (status === 429) return 'طلبات تنزيل كثيرة خلال وقت قصير — انتظر قليلاً ثم حاول مجدداً.';
  if (status === 503 && format === 'pdf') return 'تنزيل PDF غير متاح مؤقتاً — يمكنك تنزيل نسخة Word الآن.';
  return `تعذّر تنزيل المستند (HTTP ${status}).`;
}

/**
 * GET /api/exports/{answers|governance|contracts}/{id}?format=pdf|docx
 * يجلب الملف مع التوكن ويطلق تنزيل المتصفح. يرمي ApiError برسالة عربية صالحة للعرض.
 * المصادقة إلزامية؛ المالك أو admin فقط (غير ذلك 404 من الخادم).
 */
export async function downloadExport(kind: ExportKind, id: string, format: ExportFormat): Promise<void> {
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/exports/${kind}/${encodeURIComponent(id)}?format=${format}`, {
      headers,
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, 'تعذّر الاتصال بالخادم — تحقق من اتصالك وحاول مرة أخرى.');
  }

  if (!res.ok) {
    let detail: string | undefined;
    try {
      const body = (await res.json()) as { message?: unknown };
      detail = typeof body.message === 'string' ? body.message : undefined;
    } catch {
      // جسم غير JSON — الرسالة العامة تكفى
    }
    throw new ApiError(res.status, exportErrorMessage(res.status, detail, format));
  }

  const blob = await res.blob();
  const filename = parseDownloadFilename(res.headers.get('Content-Disposition')) ?? EXPORT_FALLBACK_NAMES[format];
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // تأجيل الإلغاء حتى يبدأ المتصفح التنزيل فعلاً
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

/** POST /api/exports/contracts/{id}/approve — اعتماد المراجعة البشرية لتقرير العقد (admin فقط) */
export async function approveContractReport(
  id: string,
  note?: string,
): Promise<{ approved_at: string; already_approved: boolean }> {
  return requestJson<{ approved_at: string; already_approved: boolean }>(
    `/exports/contracts/${encodeURIComponent(id)}/approve`,
    { method: 'POST', body: JSON.stringify(note ? { note } : {}) },
  );
}
