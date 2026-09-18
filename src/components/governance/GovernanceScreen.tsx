/**
 * مكوّن GovernanceScreen — شاشة "تحقق من الالتزام" (خدمة الحوكمة، Service 3).
 *
 * ⚠️ ملاحظة نطاق مهمة (اقرأ قبل التعديل): هذه أول واجهة أمامية لخدمة كانت
 * حتى 2026-09-05 بلا أى صفحة (API فقط، Phase 3 مؤجّلة). أُنشئت بناءً على طلب
 * صريح لإظهار كل خدمات الـbackend فى الواجهة فوراً. **دقة الخدمة كانت قيد
 * التحقق وقت الإنشاء** — القياس الأول (36 بنداً) أظهر 44% دقة حكم/29% دقة
 * أساس قانونى، لكن تبيّن أن هذا ملوَّث بعطل بنية تحتية خارجى (حد معدل طلبات
 * Voyage AI) لا بعيب فى منطق الخدمة.
 *
 * **تحديث 2026-09-07 (بموافقة صاحب المشروع الصريحة)**: اكتمل القياس النظيف
 * بعد حل عطل نفاد رصيد DeepSeek وإصلاحين جذريين — (1) توسيع نافذة اختيار
 * المرشحين بعد rerank من 3 إلى 5 + إصلاح تصادم مفتاح دمج المرشحين المكررين
 * (article_suffix_order) لبند gov-024، و(2) قاعدة جديدة فى assessCompliance
 * تفصل "وجود حق" عن "صحة توقيت ممارسته" لبند gov-036. **النتيجة النهائية
 * المؤكَّدة: 97.2% (35/36)** — راجع "تقرير-تحليل-وإصلاح-جذرى-gov024-gov036"
 * فى توثيق المشروع. البند المتبقى (gov-020/gov-030) عدم-حتمية موثَّقة فى
 * استجابة DeepSeek نفسها لا فى الاسترجاع، موثَّقة كمحدودية معروفة فى
 * golden_governance_test_set_v1.json (meta.known_limitations). **التنبيه
 * الدائم غير القابل للطى أدناه بقى موجوداً عمداً — لا كعلامة عدم ثقة فى
 * الدقة، بل كتنويه قانونى قياسى لأى أداة تقييم آلية — لكن نصه حُدِّث ليعكس
 * الدقة المؤكَّدة 97.2% بدل حالة "قيد التحقق" السابقة. لا تُعِد النص القديم
 * دون قرار عمل صريح.**
 *
 * الهيكلية تتبع نفس نمط ChatScreen (نموذج → تقدّم مرحلى → نتيجة/رفض/خطأ)
 * لكن بلا محادثة متعددة الأدوار — كل تحقق مستقل (يطابق طبيعة نقطة النهاية:
 * POST واحد بلا حالة محادثة فى عقد backend).
 */

'use client';

import { useState } from 'react';
import { AlertTriangle, RefreshCw, ScrollText, ShieldCheck, WifiOff } from 'lucide-react';
import type { GovernanceAssessResponse } from '@/lib/types';
import { ApiError, postGovernanceAssess } from '@/lib/api-client';
import { TextArea } from '@/components/ui/TextArea';
import { Button } from '@/components/ui/Button';
import { ProgressSteps } from '@/components/ui/ProgressSteps';
import { CitationCardSkeleton } from '@/components/ui/Skeleton';
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner';
import { GovernanceVerdictBadge } from '@/components/ui/GovernanceVerdictBadge';
import { GovernanceCitationCard } from './GovernanceCitationCard';
import { GovernanceRecommendationCard } from './GovernanceRecommendationCard';

type ScreenStatus = 'idle' | 'loading' | 'done' | 'error';

const MIN_LENGTH = 10;
const MAX_LENGTH = 4000;

const GOVERNANCE_PROGRESS_STEPS = [
  { id: 'retrieve', label: '١. جارٍ البحث فى نصوص الحوكمة والالتزام…' },
  { id: 'verify', label: '٢. جارٍ تقييم مدى الالتزام…' },
  { id: 'decide', label: '٣. جارٍ صياغة الحكم…' },
];
const MAX_PROGRESS_INDEX = GOVERNANCE_PROGRESS_STEPS.length - 1;
const PROGRESS_TICK_MS = 1400;

export function GovernanceScreen() {
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ScreenStatus>('idle');
  const [progressIndex, setProgressIndex] = useState(0);
  const [result, setResult] = useState<GovernanceAssessResponse | null>(null);
  const [validationError, setValidationError] = useState<string | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function validate(value: string): string | undefined {
    const trimmed = value.trim();
    if (trimmed.length === 0) return 'هذا الحقل مطلوب.';
    if (trimmed.length < MIN_LENGTH) return `الوصف قصير جداً — أدخل ${MIN_LENGTH} أحرف على الأقل.`;
    if (trimmed.length > MAX_LENGTH) return `الوصف طويل جداً — الحد الأقصى ${MAX_LENGTH} حرفاً.`;
    return undefined;
  }

  /** المنطق الفعلى مستقل عن الحدث — يستدعيه كل من إرسال النموذج وزر «إعادة المحاولة» بلا تمرير حدث وهمى */
  async function runAssessment() {
    const trimmed = description.trim();
    const error = validate(trimmed);
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError(undefined);
    setStatus('loading');
    setResult(null);
    setErrorMessage(null);
    setProgressIndex(0);

    const progressTimer = setInterval(() => {
      setProgressIndex((prev) => Math.min(prev + 1, MAX_PROGRESS_INDEX));
    }, PROGRESS_TICK_MS);

    try {
      const response = await postGovernanceAssess({ action_description: trimmed });
      setResult(response);
      setStatus('done');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 0
            ? 'تعذّر الاتصال بالخادم — تحقق من اتصالك وحاول مرة أخرى.'
            : `فشل التحقق (HTTP ${err.status}) — حاول مرة أخرى.`
          : 'حدث خطأ غير متوقّع — حاول مرة أخرى.';
      setErrorMessage(message);
      setStatus('error');
    } finally {
      clearInterval(progressTimer);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    void runAssessment();
  }

  function handleReset() {
    setDescription('');
    setResult(null);
    setStatus('idle');
    setErrorMessage(null);
    setValidationError(undefined);
  }

  return (
    <main className="mx-auto w-full max-w-[860px] flex-1 px-4 pb-28 pt-6 sm:px-8 lg:pb-10">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <ScrollText className="h-10 w-10 text-primary" aria-hidden="true" />
        <h1 className="text-h2 font-bold text-text-primary">تحقق من الالتزام بقواعد الحوكمة</h1>
        <p className="max-w-lg text-body text-text-secondary">
          صف إجراءً أو قراراً تنوي اتخاذه (مكافحة غسل أموال/تمويل إرهاب، تأمين، أو تمويل غير
          مصرفى) — نتحقق من مطابقته للنصوص المفهرَسة ونعرض حكماً موثّقاً بمصادره.
        </p>
      </div>

      {/* تنبيه دائم غير قابل للطى — عمداً، بخلاف DisclaimerBanner القابل للطى
          أدناه. راجع تعليق أعلى الملف قبل إزالته أو إعادة نصه لصيغته القديمة. */}
      <div
        role="alert"
        className="mb-6 flex items-start gap-3 rounded-lg border border-warning bg-warning-soft px-4 py-3"
      >
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
        <div>
          <p className="text-body-sm font-semibold text-text-primary">
            دقة مقاسة ومؤكَّدة: 97.2% — يبقى التحقق البشرى ضرورياً
          </p>
          <p className="mt-1 text-body-sm text-text-secondary">
            نتائج هذا التحقق مبنية على تحليل آلى لنصوص الحوكمة والالتزام المفهرَسة، بدقة قياسية
            مؤكَّدة 97.2% (35 من 36 حالة اختبار مرجعية، آخر قياس نظيف بتاريخ 2026-09-07). لا تعتمد
            على النتيجة كقرار نهائى — راجع محامٍ أو مختص امتثال قبل أى إجراء فعلى، خاصة عند حكم
            &quot;غير متوافق&quot; أو &quot;متوافق جزئياً&quot;.
          </p>
          <p className="mt-2 text-body-sm text-text-secondary">
            <span className="font-semibold">حدود معروفة فى نطاق التغطية:</span> نستبعد حالياً
            مستندين معروفين لعدم توفر نص رسمى نظيف قابل للفهرسة — قرار مجلس إدارة الهيئة العامة
            للرقابة المالية رقم 205 لسنة 2021 (قواعد التناسب والملاءمة للوظائف التنفيذية الرئيسية
            بشركات التأمين وإعادة التأمين)، وقرار وزير العدل رقم 951 لسنة 2003 (اللائحة التنفيذية
            لقانون مكافحة غسل الأموال). إن كان سؤالك يخصّ أياً منهما تحديداً، لا تعتمد على غياب
            استشهاد بهما كدليل عدم انطباق — راجع مختص امتثال مباشرة.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <TextArea
          label="وصف الإجراء أو القرار"
          placeholder="مثال: شركة تمويل استهلاكى تنوي عدم إبلاغ وحدة مكافحة غسل الأموال عن عملية تحويل تتجاوز الحد المقرر…"
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
            if (validationError) setValidationError(undefined);
          }}
          rows={5}
          maxLength={MAX_LENGTH}
          disabled={status === 'loading'}
          error={validationError}
          helper={!validationError ? `من ${MIN_LENGTH} إلى ${MAX_LENGTH} حرفاً — كلما زادت التفاصيل، زادت دقة الحكم.` : undefined}
        />
        <div className="flex items-center gap-3">
          <Button type="submit" loading={status === 'loading'} disabled={status === 'loading'}>
            تحقق الآن
          </Button>
          {result || status === 'error' ? (
            <Button type="button" variant="ghost" onClick={handleReset}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              تحقق من إجراء آخر
            </Button>
          ) : null}
        </div>
      </form>

      <div className="mt-6 space-y-4" aria-live="polite">
        {status === 'loading' ? (
          <div className="space-y-4">
            <ProgressSteps steps={GOVERNANCE_PROGRESS_STEPS} currentIndex={progressIndex} />
            <CitationCardSkeleton />
          </div>
        ) : null}

        {status === 'error' && errorMessage ? (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-border-default bg-surface p-5">
            <div className="flex items-start gap-2">
              <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-error" aria-hidden="true" />
              <p className="text-body text-text-primary">{errorMessage}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => void runAssessment()}>
              إعادة المحاولة
            </Button>
          </div>
        ) : null}

        {status === 'done' && result ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border-default bg-surface p-5">
              <GovernanceVerdictBadge verdict={result.verdict} />

              <div className="mt-4 flex items-start gap-2 border-t border-border-default pt-4">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" />
                <p className="text-body-sm text-text-secondary">{result.risk_note}</p>
              </div>
            </div>

            {result.legal_basis.length > 0 ? (
              result.legal_basis.map((basis, index) => (
                <GovernanceCitationCard key={`${basis.law_no}-${basis.article_no}-${index}`} basis={basis} />
              ))
            ) : (
              <p className="rounded-md bg-surface-muted px-4 py-3 text-body-sm text-text-tertiary">
                لا يوجد أساس قانونى محدَّد لهذا الحكم — هذا متوقَّع تحديداً عند حكم
                &quot;معلومات غير كافية&quot; (لا مادة كافية للاستشهاد بها).
              </p>
            )}

            {/* طبقة التوصية + استشهاد العقوبة (2026-09-18) — راجع تعليق
                GovernanceRecommendationCard لتفاصيل اكتشاف هذه الفجوة.
                recommendation غائب فى استجابات قديمة (اختيارى ?:) وnull فى
                حالة نادرة موثَّقة فى backend — كلاهما لا يُعرض شيئاً هنا،
                بلا أى خطأ أو نص بديل، لأن غيابه متوقَّع ومقصود فى تلك الحالات. */}
            {result.recommendation ? (
              <GovernanceRecommendationCard recommendation={result.recommendation} />
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-8">
        <DisclaimerBanner />
      </div>
    </main>
  );
}
