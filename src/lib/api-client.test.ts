/**
 * اختبارات عميل API — نقطة الربط الوحيدة بين الواجهة والخلفية.
 *
 * يغطي كل دوال endpoints في src/lib/api-client.ts (لم تكن مغطاة سابقاً —
 * كانت التغطية 56.25%: فقط postQuestion):
 * - fetchHealth / fetchQuestionHistory / postFeedback / registerUser /
 *   loginUser / logoutUser / fetchMe / fetchReviewQueue / resolveReview.
 * - إرفاق Authorization: Bearer عند وجود جلسة (وعدم إرفاقه بلا جلسة).
 * - مسارات الخطأ في requestJson: استجابة غير ناجحة (ApiError بالكود) +
 *   فشل شبكة (ApiError status=0).
 *
 * عقد الـ API: backend/openapi.yaml (مصدر الحقيقة) — لا تعديل هنا من طرف واحد.
 */

import {
  ApiError,
  deleteQuestion,
  fetchHealth,
  fetchMe,
  fetchQuestionHistory,
  fetchReviewQueue,
  loginUser,
  logoutUser,
  postFeedback,
  postQuestion,
  registerUser,
  resolveReview,
} from './api-client';
import { getAccessToken } from './auth';

jest.mock('./auth', () => ({
  getAccessToken: jest.fn(),
}));

const mockedGetAccessToken = getAccessToken as jest.MockedFunction<typeof getAccessToken>;

/** استجابة JSON مصغرة متوافقة مع واجهة Response (jsdom لا يملك Response كاملاً) */
function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

const ANSWER_BODY = {
  id: 'a-1',
  answer: 'نعم، لك حق في تعويض.',
  confidence: 0.92,
  citations: [],
  refused: false,
};

describe('api-client', () => {
  const mockFetch = jest.fn();
  const originalFetch = global.fetch;

  beforeAll(() => {
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    mockFetch.mockReset();
    mockedGetAccessToken.mockReset();
    mockedGetAccessToken.mockReturnValue(null);
  });

  describe('requestJson — مسارات الخطأ المشتركة', () => {
    it('يرمي ApiError بكود الحالة — و401 تظهر في الرسالة (يعتمد عليها توجيه المستخدم)', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ message: 'غير مصادق' }, 401));

      try {
        await fetchHealth();
        fail('كان يجب أن يرمي ApiError');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.status).toBe(401);
          expect(error.message).toContain('401');
        }
      }
    });

    it('يرمي ApiError status=0 عند فشل الاتصال بالشبكة', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('network down'));

      try {
        await loginUser({ email: 'a@b.com', password: 'secret' });
        fail('كان يجب أن يرمي ApiError');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.status).toBe(0);
        }
      }
    });

    it('يرمي ApiError على أي استجابة غير ناجحة (500 مثلاً)', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ message: 'خطأ داخلي' }, 500));

      try {
        await fetchQuestionHistory();
        fail('كان يجب أن يرمي ApiError');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.status).toBe(500);
        }
      }
    });
  });

  describe('auth — إرفاق التوكن', () => {
    it('يرفق Authorization: Bearer عند وجود جلسة', async () => {
      mockedGetAccessToken.mockReturnValue('token-123');
      mockFetch.mockResolvedValueOnce(jsonResponse(ANSWER_BODY));

      await postQuestion({ question: 'سؤال؟' });

      const [, init] = mockFetch.mock.calls[0];
      const headers = (init as RequestInit).headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer token-123');
    });

    it('لا يرفق Authorization عند غياب الجلسة', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(ANSWER_BODY));

      await postQuestion({ question: 'سؤال؟' });

      const [, init] = mockFetch.mock.calls[0];
      const headers = (init as RequestInit).headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
    });
  });

  describe('postQuestion — POST /questions', () => {
    it('يرسل POST /questions بجسم JSON ويعيد الرد', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(ANSWER_BODY));

      const result = await postQuestion({ question: 'هل لي حق في تعويض؟' });

      expect(result.id).toBe('a-1');
      expect(result.confidence).toBe(0.92);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/questions'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ question: 'هل لي حق في تعويض؟' }),
        }),
      );
    });
  });

  describe('fetchQuestionHistory — GET /questions/history', () => {
    it('يعيد سجل الأسئلة {items,total}', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              id: 'q-1',
              question: 'سؤال؟',
              category: 'labor',
              refused: false,
              confidence: 0.9,
              created_at: '2026-08-17T10:00:00.000Z',
            },
          ],
          total: 1,
        }),
      );

      const result = await fetchQuestionHistory();

      expect(result.total).toBe(1);
      expect(result.items[0].question).toBe('سؤال؟');
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/questions/history');
      // GET بلا method صريح — init يحمل cache و headers فقط
      const [, init] = mockFetch.mock.calls[0];
      expect((init as RequestInit).method).toBeUndefined();
      expect((init as RequestInit).cache).toBe('no-store');
    });
  });

  describe('deleteQuestion — DELETE /questions/{id} (F-14 — 151/2020)', () => {
    it('يرسل DELETE على مسار السؤال ويعيد {success}', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }));

      const result = await deleteQuestion('q-1');

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/questions/q-1'),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('يرمي ApiError 403 عند حذف سؤال لا يملكه المستخدم', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ message: 'not allowed' }, 403));

      try {
        await deleteQuestion('q-other');
        fail('كان يجب أن يرمي ApiError');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.status).toBe(403);
          expect(error.message).toContain('403');
        }
      }
    });

    it('يرمي ApiError status=0 عند فشل الاتصال (يبقى العنصر في القائمة)', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('network down'));

      try {
        await deleteQuestion('q-1');
        fail('كان يجب أن يرمي ApiError');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.status).toBe(0);
        }
      }
    });
  });

  describe('postFeedback — POST /feedback', () => {
    it('يرسل التقييم بجسم JSON ويعيد الرد', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          id: 'f-1',
          answer_id: 'a-1',
          rating: 1,
          comment: null,
          created_at: '2026-08-17T10:00:00.000Z',
        }),
      );

      const result = await postFeedback({ answer_id: 'a-1', rating: 1 });

      expect(result.rating).toBe(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/feedback'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ answer_id: 'a-1', rating: 1 }),
        }),
      );
    });
  });

  describe('registerUser — POST /auth/register', () => {
    it('يرسل بيانات التسجيل ويعيد الملف (بدون توكنات — عقد backend)', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          id: 'u-1',
          email: 'a@b.com',
          full_name: null,
          role: 'user',
          created_at: '2026-08-17T10:00:00.000Z',
        }),
      );

      const result = await registerUser({ email: 'a@b.com', password: 'secret' });

      expect(result.role).toBe('user');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/register'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'a@b.com', password: 'secret' }),
        }),
      );
    });
  });

  describe('loginUser — POST /auth/login', () => {
    it('يرسل بيانات الدخول ويعيد التوكنات', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          access_token: 'access-1',
          refresh_token: 'refresh-1',
          user: { id: 'u-1', email: 'a@b.com', full_name: null, role: 'user', created_at: 'x' },
        }),
      );

      const result = await loginUser({ email: 'a@b.com', password: 'secret' });

      expect(result.access_token).toBe('access-1');
      expect(result.refresh_token).toBe('refresh-1');
    });
  });

  describe('logoutUser — POST /auth/logout', () => {
    it('يرسل refresh_token في الجسم ويعيد {success}', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }));

      const result = await logoutUser('refresh-1');

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ refresh_token: 'refresh-1' }),
        }),
      );
    });
  });

  describe('fetchMe — GET /auth/me', () => {
    it('يعيد ملف المستخدم الحالي', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          id: 'u-1',
          email: 'a@b.com',
          full_name: 'أحمد',
          role: 'lawyer',
          created_at: '2026-08-17T10:00:00.000Z',
        }),
      );

      const result = await fetchMe();

      expect(result.role).toBe('lawyer');
      expect(result.full_name).toBe('أحمد');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/me'),
        expect.anything(),
      );
    });
  });

  describe('fetchReviewQueue — GET /reviews (EP-06)', () => {
    it('يرسل status=pending و limit/offset ويعيد {items,total}', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              id: 'r-1',
              answer_id: 'a-1',
              reviewer_id: null,
              status: 'pending',
              review_note: null,
              reviewed_at: null,
              created_at: '2026-08-17T08:00:00.000Z',
              context: {
                question: 'سؤال؟',
                answer: 'إجابة',
                confidence: 0.4,
                category: 'labor',
                citations: [],
              },
            },
          ],
          total: 1,
        }),
      );

      const result = await fetchReviewQueue('pending', 20, 0);

      expect(result.total).toBe(1);
      expect(result.items[0].status).toBe('pending');
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/reviews?');
      expect(url).toContain('status=pending');
      expect(url).toContain('limit=20');
      expect(url).toContain('offset=0');
    });

    it('بدون status لا يضيف معامل status', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ items: [], total: 0 }));

      await fetchReviewQueue();

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).not.toContain('status=');
    });
  });

  describe('resolveReview — PATCH /reviews/{id} (EP-06)', () => {
    it('يرسل PATCH بالحالة والملاحظة ويعيد العنصر المحدّث', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          id: 'r-1',
          answer_id: 'a-1',
          reviewer_id: 'lawyer-1',
          status: 'approved',
          review_note: 'الاستشهاد صحيح',
          reviewed_at: '2026-08-17T09:00:00.000Z',
          created_at: '2026-08-17T08:00:00.000Z',
        }),
      );

      const result = await resolveReview('r-1', {
        status: 'approved',
        review_note: 'الاستشهاد صحيح',
      });

      expect(result.status).toBe('approved');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/reviews/r-1'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'approved', review_note: 'الاستشهاد صحيح' }),
        }),
      );
    });
  });
});
