/**
 * مكوّن ContractsScreen — شاشة "المدقق القانونى للعقود" (خدمة Service 2).
 *
 * ⚠️ ملاحظة نطاق مهمة (اقرأ قبل التعديل): هذه أول واجهة أمامية لخدمة كانت حتى
 * 2026-09-05 بلا أى صفحة (API فقط، Phase 1+2 الأساسية فى backend — راجع
 * تقرير-بناء-خدمة-المدقق-القانونى-للعقود-2026-09-05.md). Phase 3 (تصنيف
 * مخاطر، صياغة بديلة، مراجعة محامٍ) وPhase 4 (تقرير PDF) مؤجَّلتان عمداً بطلب
 * صريح من رجل الأعمال — لا تُبنَ فى هذه الشاشة.
 *
 * فجوة تغطية معروفة وصريحة يجب ألا تُخفى عن المستخدم: القانون المدنى المصرى
 * 131/1943 (الحاكم لأغلب بنود عقود الإيجار/الخدمات غير التجارية البحتة) غير
 * مفهرَس بعد فى قاعدة القوانين — أى بند من هذا النوع سيُصنَّف بصدق "لا يوجد
 * نص قانونى مصرى مفهرَس ذو صلة مباشرة"، وهذا رفض أمين متعمَّد لا عطل. التنبيه
 * الدائم أدناه يذكر هذا صراحة (غير قابل للطى، بنفس مبدأ تنبيه GovernanceScreen).
 *
 * ⚠️ مصادقة إلزامية (بخلاف GovernanceScreen): نقطة النهاية POST /api/contracts
 * تتطلب JwtAuthGuard إلزامياً فى backend (بيانات عقود عمل حقيقية للمستخدم) —
 * هذه الشاشة تتحقق من isAuthenticated() وتعرض دعوة لتسجيل الدخول بدل نموذج
 * الرفع عند غياب الجلسة، بدل الاعتماد على 401 من الخادم فقط.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, FileWarning, FlaskConical, LogIn, RefreshCw, ScrollText, UploadCloud, WifiOff } from 'lucide-react';
import type { ContractResponse } from '@/lib/types';
import { ApiError, uploadContract } from '@/lib/api-client';
import { isAuthenticated } from '@/lib/auth';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ProgressSteps } from '@/components/ui/ProgressSteps';
import { CitationCardSkeleton } from '@/components/ui/Skeleton';
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner';
import { ContractClauseCard } from './ContractClauseCard';

type ScreenStatus = 'idle' | 'loading' | 'done' | 'error';

const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB — يطابق MAX_UPLOAD_BYTES فى backend

const UPLOAD_PROGRESS_STEPS = [
  { id: 'upload', label: '١. جارٍ رفع الملف…' },
  { id: 'extract', label: '٢. جارٍ استخراج النص وتقسيمه لبنود…' },
  { id: 'retrieve', label: '٣. جارٍ البحث عن مواد قانونية ذات صلة لكل بند…' },
  { id: 'assess', label: '٤. جارٍ تقييم كل بند…' },
];
const MAX_PROGRESS_INDEX = UPLOAD_PROGRESS_STEPS.length - 1;
const PROGRESS_TICK_MS = 1400;

function validateFile(file: File): string | undefined {
  const lowerName = file.name.toLowerCase();
  const hasAllowedExtension = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  if (!hasAllowedExtension) {
    return 'نوع ملف غير مدعوم — المسموح: PDF أو DOCX فقط.';
  }
  if (file.size > MAX_FILE_BYTES) {
    return 'حجم الملف كبير جداً — الحد الأقصى 10 ميجابايت.';
  }
  return undefined;
}

export function ContractsScreen() {
  const [authed, setAuthed] = useState<boolean | null>(null); // null = لم يُتحقَّق بعد (client-only)
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ScreenStatus>('idle');
  const [progressIndex, setProgressIndex] = useState(0);
  const [result, setResult] = useState<ContractResponse | null>(null);
  const [validationError, setValidationError] = useState<string | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // متعمّد: isAuthenticated() (sessionStorage) متاح للعميل فقط؛ قراءته أثناء
    // hydration مباشرة تكسر تطابق SSR (نفس نمط Header.tsx).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthed(isAuthenticated());
  }, []);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setResult(null);
    setErrorMessage(null);
    if (!selected) {
      setFile(null);
      setValidationError(undefined);
      return;
    }
    const error = validateFile(selected);
    setValidationError(error);
    setFile(error ? null : selected);
  }

  async function runUpload() {
    if (!file) {
      setValidationError('اختر ملف عقد أولاً (PDF أو DOCX).');
      return;
    }
    setStatus('loading');
    setResult(null);
    setErrorMessage(null);
    setProgressIndex(0);

    const progressTimer = setInterval(() => {
      setProgressIndex((prev) => Math.min(prev + 1, MAX_PROGRESS_INDEX));
    }, PROGRESS_TICK_MS);

    try {
      const response = await uploadContract(file);
      setResult(response);
      setStatus('done');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 0
            ? 'تعذّر الاتصال بالخادم — تحقق من اتصالك وحاول مرة أخرى.'
            : err.status === 401
              ? 'انتهت صلاحية جلستك — سجّل الدخول مرة أخرى ثم أعد المحاولة.'
              : err.message || `فشل رفع العقد (HTTP ${err.status}) — حاول مرة أخرى.`
          : 'حدث خطأ غير متوقّع — حاول مرة أخرى.';
      setErrorMessage(message);
      setStatus('error');
    } finally {
      clearInterval(progressTimer);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    void runUpload();
  }

  function handleReset() {
    setFile(null);
    setResult(null);
    setStatus('idle');
    setErrorMessage(null);
    setValidationError(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <main className="mx-auto w-full max-w-[860px] flex-1 px-4 pb-28 pt-6 sm:px-8 lg:pb-10">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <ScrollText className="h-10 w-10 text-primary" aria-hidden="true" />
        <h1 className="text-h2 font-bold text-text-primary">المدقق القانونى للعقود</h1>
        <p className="max-w-lg text-body text-text-secondary">
          ارفع عقداً (PDF أو DOCX) — نستخرج بنوده ونبحث لكل بند عن مواد قانونية مصرية مفهرَسة ذات
          صلة، ونعرض تقييماً أولياً لكل بند.
        </p>
      </div>

      {/* تنبيه دائم غير قابل للطى — نفس مبدأ GovernanceScreen. راجع تعليق أعلى
          الملف قبل إزالته أو تلطيفه. */}
      <div
        role="alert"
        className="mb-6 flex items-start gap-3 rounded-lg border border-warning bg-warning-soft px-4 py-3"
      >
        <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
        <div>
          <p className="text-body-sm font-semibold text-text-primary">ميزة جديدة — Phase 1+2 الأساسية فقط</p>
          <p className="mt-1 text-body-sm text-text-secondary">
            القانون المدنى المصرى (الحاكم لأغلب بنود عقود الإيجار/الخدمات) غير مفهرَس بعد فى قاعدة
            القوانين — أى بند من هذا النوع سيُعرَض بصدق كـ&quot;لا يوجد نص مفهرَس&quot; بدل استشهاد
            مُخترَع. هذا تقييم أولى فقط ولا يُغنى عن مراجعة محامٍ مختص قبل أى قرار فعلى.
          </p>
        </div>
      </div>

      {authed === false ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-border-default bg-surface p-8 text-center">
          <LogIn className="h-8 w-8 text-text-tertiary" aria-hidden="true" />
          <div>
            <p className="text-body font-semibold text-text-primary">تحتاج تسجيل الدخول أولاً</p>
            <p className="mt-1 text-body-sm text-text-secondary">
              رفع العقود يتطلب حساباً — عقودك بيانات عمل خاصة بك، لا تُعرض لأى مستخدم آخر.
            </p>
          </div>
          <ButtonLink href="/login">تسجيل الدخول</ButtonLink>
        </div>
      ) : authed === true ? (
        <>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="contract-file" className="mb-2 block text-body-sm text-text-secondary">
                ملف العقد
              </label>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  id="contract-file"
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange}
                  disabled={status === 'loading'}
                  aria-invalid={Boolean(validationError) || undefined}
                  aria-describedby={validationError ? 'contract-file-error' : 'contract-file-helper'}
                  className="block w-full flex-1 rounded-md border border-border-default bg-surface text-body-sm text-text-primary file:mr-3 file:rounded-md file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:text-body-sm file:font-medium file:text-primary hover:border-border-strong focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--color-focus-ring)] disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled-text"
                />
              </div>
              {validationError ? (
                <p id="contract-file-error" role="alert" className="mt-1.5 flex items-center gap-1 text-body-sm text-error">
                  <FileWarning className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {validationError}
                </p>
              ) : (
                <p id="contract-file-helper" className="mt-1.5 text-caption text-text-tertiary">
                  PDF أو DOCX فقط — حتى 10 ميجابايت.
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" loading={status === 'loading'} disabled={status === 'loading' || !file}>
                <UploadCloud className="h-4 w-4" aria-hidden="true" />
                رفع وتحليل العقد
              </Button>
              {result || status === 'error' ? (
                <Button type="button" variant="ghost" onClick={handleReset}>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  تحليل عقد آخر
                </Button>
              ) : null}
            </div>
          </form>

          <div className="mt-6 space-y-4" aria-live="polite">
            {status === 'loading' ? (
              <div className="space-y-4">
                <ProgressSteps steps={UPLOAD_PROGRESS_STEPS} currentIndex={progressIndex} />
                <CitationCardSkeleton />
              </div>
            ) : null}

            {status === 'error' && errorMessage ? (
              <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-border-default bg-surface p-5">
                <div className="flex items-start gap-2">
                  <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-error" aria-hidden="true" />
                  <p className="text-body text-text-primary">{errorMessage}</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => void runUpload()}>
                  إعادة المحاولة
                </Button>
              </div>
            ) : null}

            {status === 'done' && result ? (
              <div className="space-y-4">
                {result.status === 'extraction_failed' ? (
                  <div className="rounded-lg border border-error bg-error-soft p-5">
                    <div className="flex items-start gap-2">
                      <FileWarning className="mt-0.5 h-5 w-5 shrink-0 text-error" aria-hidden="true" />
                      <div>
                        <p className="text-body font-semibold text-text-primary">تعذَّر استخراج نص العقد</p>
                        <p className="mt-1 text-body-sm text-text-secondary">
                          {result.extraction_error ?? 'خطأ غير محدَّد أثناء استخراج النص.'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="rounded-lg border border-border-default bg-surface p-5">
                      <p className="text-body font-semibold text-text-primary">{result.original_filename}</p>
                      <p className="mt-1 text-body-sm text-text-secondary">
                        {result.clause_count ?? 0} بند تم استخراجه وتقييمه.
                      </p>
                    </div>

                    {result.warnings && result.warnings.length > 0 ? (
                      <div className="flex items-start gap-2 rounded-lg border border-warning bg-warning-soft px-4 py-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                        <ul className="list-inside list-disc space-y-1 text-body-sm text-text-secondary">
                          {result.warnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {result.clauses && result.clauses.length > 0 ? (
                      result.clauses.map((clause) => <ContractClauseCard key={clause.id} clause={clause} />)
                    ) : (
                      <p className="rounded-md bg-surface-muted px-4 py-3 text-body-sm text-text-tertiary">
                        لم يُستخرَج أى بند من هذا العقد.
                      </p>
                    )}
                  </>
                )}
              </div>
            ) : null}
          </div>
        </>
      ) : null /* authed === null: لم يُتحقَّق بعد (client-only) — لا نعرض أى شىء لتفادى وميض */}

      <div className="mt-8">
        <DisclaimerBanner />
      </div>
    </main>
  );
}
