/**
 * MemosScreen — «المذكرات القانونية»: مسودة مذكرة/تقرير مقيَّدة بالمصادر.
 *
 * قرار المنتج (2026-10-15): لا تُكتب فقرة قانونية بلا سند. الخادم يعيد استخدام محرك
 * الإجابة الموثَّقة نفسه (لا استرجاع ولا موجِّه جديد)، فتُبنى المذكرة من مواد مفهرسة
 * فقط، كل حكم موسوم «نص» أو «تفسير». وقائع المستخدم وطلباته تُنسخ حرفياً ولا يتحقق
 * منها النظام. صفة الطرف (مدعٍ/مدعى عليه/استشارى) تؤثر على ترويسة المستند فقط ولا على
 * الأسانيد. المستند الناتج مسودة دائماً: «مسودة — تحتاج مراجعة محامٍ».
 *
 * الشاشة تشترط حساباً مسجَّلاً (المذكرة سجل مشفَّر مملوك للمستخدم). لا يوجد هنا
 * أى منطق قانونى: كل شيء يأتى محسوماً من الخادم.
 */

'use client';

import { useEffect, useState } from 'react';
import { FileText, LogIn, Plus, RefreshCw, Trash2, WifiOff } from 'lucide-react';
import type { CreateMemoResponse, MemoType, PartyRole } from '@/lib/types';
import { ApiError, createMemo } from '@/lib/api-client';
import { isAuthenticated } from '@/lib/auth';
import { Button, ButtonLink } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/TextArea';
import { TextField } from '@/components/ui/TextField';
import { ExportButtons } from '@/components/ui/ExportButtons';
import { ProgressSteps } from '@/components/ui/ProgressSteps';
import { CitationCardSkeleton } from '@/components/ui/Skeleton';
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner';
import { StructuredAnswerView } from '@/components/chat/StructuredAnswerView';

type ScreenStatus = 'idle' | 'loading' | 'done' | 'error';

export const ISSUE_MIN = 10;
export const ISSUE_MAX = 500;
export const FACTS_MIN = 30;
export const FACTS_MAX = 1400;
export const TITLE_MAX = 150;
export const REQUESTS_MAX = 6;
export const REQUEST_MAX_CHARS = 200;

const MEMO_TYPE_OPTIONS: ReadonlyArray<{ value: MemoType; label: string }> = [
  { value: 'opinion_memo', label: 'مذكرة رأى قانونى' },
  { value: 'defense_memo', label: 'مذكرة دفاع' },
  { value: 'legal_report', label: 'تقرير قانونى' },
];

const PARTY_ROLE_OPTIONS: ReadonlyArray<{ value: PartyRole; label: string }> = [
  { value: 'advisory', label: 'استشارى (بلا طرف)' },
  { value: 'claimant', label: 'مدعٍ / طالب' },
  { value: 'defendant', label: 'مدعى عليه / مطلوب ضده' },
];

const PROGRESS_STEPS = [
  { id: 'retrieve', label: '١. جارٍ البحث فى النصوص القانونية المفهرَسة…' },
  { id: 'verify', label: '٢. جارٍ التحقق من الأسانيد…' },
  { id: 'compose', label: '٣. جارٍ تجهيز المسودة…' },
];
const MAX_PROGRESS_INDEX = PROGRESS_STEPS.length - 1;
const PROGRESS_TICK_MS = 1600;

const SELECT_CLASSES =
  'h-11 w-full rounded-md border border-border-default bg-surface px-3 text-body-sm text-text-primary focus:outline-none focus-visible:shadow-[0_0_0_3px_var(--color-focus-ring)]';

interface FieldErrors {
  issue?: string;
  facts?: string;
  requests?: string;
}

export function MemosScreen() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [memoType, setMemoType] = useState<MemoType>('opinion_memo');
  const [partyRole, setPartyRole] = useState<PartyRole>('advisory');
  const [title, setTitle] = useState('');
  const [issue, setIssue] = useState('');
  const [facts, setFacts] = useState('');
  const [requests, setRequests] = useState<string[]>([]);
  const [status, setStatus] = useState<ScreenStatus>('idle');
  const [progressIndex, setProgressIndex] = useState(0);
  const [result, setResult] = useState<CreateMemoResponse | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // متعمّد: sessionStorage متاح للعميل فقط؛ القراءة أثناء hydration تكسر تطابق SSR
    // (نفس نمط ContractsScreen/ExportButtons).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthed(isAuthenticated());
  }, []);

  const showRequests = memoType === 'defense_memo';

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    const i = issue.trim();
    const f = facts.trim();
    if (i.length === 0) next.issue = 'هذا الحقل مطلوب.';
    else if (i.length < ISSUE_MIN) next.issue = `المسألة قصيرة جداً — أدخل ${ISSUE_MIN} أحرف على الأقل.`;
    if (f.length === 0) next.facts = 'هذا الحقل مطلوب.';
    else if (f.length < FACTS_MIN) next.facts = `الوقائع قصيرة جداً — أدخل ${FACTS_MIN} حرفاً على الأقل.`;
    if (showRequests && requests.some((r) => r.trim().length > REQUEST_MAX_CHARS)) {
      next.requests = `كل طلب بحد أقصى ${REQUEST_MAX_CHARS} حرفاً.`;
    }
    return next;
  }

  async function runCreate() {
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const cleanRequests = showRequests ? requests.map((r) => r.trim()).filter((r) => r.length > 0) : [];
    setStatus('loading');
    setResult(null);
    setErrorMessage(null);
    setProgressIndex(0);

    const timer = setInterval(() => {
      setProgressIndex((prev) => Math.min(prev + 1, MAX_PROGRESS_INDEX));
    }, PROGRESS_TICK_MS);

    try {
      const response = await createMemo({
        memo_type: memoType,
        party_role: partyRole,
        ...(title.trim() ? { title: title.trim() } : {}),
        issue: issue.trim(),
        facts: facts.trim(),
        ...(cleanRequests.length > 0 ? { requests: cleanRequests } : {}),
      });
      setResult(response);
      setStatus('done');
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'حدث خطأ غير متوقّع — حاول مرة أخرى.');
      setStatus('error');
    } finally {
      clearInterval(timer);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    void runCreate();
  }

  function handleReset() {
    setTitle('');
    setIssue('');
    setFacts('');
    setRequests([]);
    setResult(null);
    setStatus('idle');
    setErrorMessage(null);
    setErrors({});
  }

  const busy = status === 'loading';
  const answer = result?.answer ?? null;

  return (
    <main className="mx-auto w-full max-w-[860px] flex-1 px-4 pb-28 pt-6 sm:px-8 lg:pb-10">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <FileText className="h-10 w-10 text-primary" aria-hidden="true" />
        <h1 className="text-h2 font-bold text-text-primary">المذكرات والتقارير القانونية</h1>
        <p className="max-w-lg text-body text-text-secondary">
          نجهّز لك مسودة مقيَّدة بالمصادر: كل فقرة قانونية مبنية على مواد مفهرَسة وموسومة «نص» أو
          «تفسير»، ووقائعك وطلباتك تُنسخ كما كتبتها.
        </p>
      </div>

      <div
        role="note"
        className="mb-6 rounded-lg border border-warning bg-warning-soft px-4 py-3 text-body-sm text-text-primary"
      >
        الناتج مسودة دائماً — «مسودة — تحتاج مراجعة محامٍ». لا يتحقق النظام من صحة الوقائع التى تدخلها،
        ولا يُغنى عن مراجعة محامٍ قبل تقديمه لأى جهة.
      </div>

      {authed === false ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-border-default bg-surface p-8 text-center">
          <LogIn className="h-8 w-8 text-text-tertiary" aria-hidden="true" />
          <div>
            <p className="text-body font-semibold text-text-primary">تحتاج تسجيل الدخول أولاً</p>
            <p className="mt-1 text-body-sm text-text-secondary">
              المذكرة سجل خاص بك ووقائعها مشفَّرة — لا تُعرض لأى مستخدم آخر.
            </p>
          </div>
          <ButtonLink href="/login">تسجيل الدخول</ButtonLink>
        </div>
      ) : authed === true ? (
        <>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="memo-type" className="mb-2 block text-body-sm text-text-secondary">
                  نوع المستند
                </label>
                <select
                  id="memo-type"
                  value={memoType}
                  onChange={(event) => setMemoType(event.target.value as MemoType)}
                  disabled={busy}
                  className={SELECT_CLASSES}
                >
                  {MEMO_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="memo-party" className="mb-2 block text-body-sm text-text-secondary">
                  صفة مقدِّم المستند
                </label>
                <select
                  id="memo-party"
                  value={partyRole}
                  onChange={(event) => setPartyRole(event.target.value as PartyRole)}
                  disabled={busy}
                  className={SELECT_CLASSES}
                >
                  {PARTY_ROLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-caption text-text-tertiary">
                  تظهر فى ترويسة المستند فقط — لا تغيّر الأسانيد القانونية.
                </p>
              </div>
            </div>

            <TextField
              label="عنوان المستند (اختيارى)"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={TITLE_MAX}
              disabled={busy}
              helper="إن تركته فارغاً نضع عنواناً مناسباً لنوع المستند."
            />

            <TextArea
              label="المسألة القانونية"
              placeholder="مثال: هل يستحق العامل تعويضاً عن إنهاء عقده دون إخطار مسبق؟"
              value={issue}
              onChange={(event) => {
                setIssue(event.target.value);
                if (errors.issue) setErrors((prev) => ({ ...prev, issue: undefined }));
              }}
              rows={3}
              maxLength={ISSUE_MAX}
              disabled={busy}
              error={errors.issue}
              helper={!errors.issue ? `من ${ISSUE_MIN} إلى ${ISSUE_MAX} حرفاً.` : undefined}
            />

            <TextArea
              label="الوقائع"
              placeholder="اكتب الوقائع كما حدثت: التواريخ، الأطراف، نوع العقد، ما جرى بالتحديد…"
              value={facts}
              onChange={(event) => {
                setFacts(event.target.value);
                if (errors.facts) setErrors((prev) => ({ ...prev, facts: undefined }));
              }}
              rows={6}
              maxLength={FACTS_MAX}
              disabled={busy}
              error={errors.facts}
              helper={
                !errors.facts
                  ? `من ${FACTS_MIN} إلى ${FACTS_MAX} حرفاً — تُنسخ فى المستند كما كتبتها ولا يتحقق النظام من صحتها.`
                  : undefined
              }
            />

            {showRequests ? (
              <fieldset className="space-y-2" disabled={busy}>
                <legend className="mb-1 text-body-sm text-text-secondary">
                  الطلبات (اختيارى — حتى {REQUESTS_MAX} طلبات، تُدرج بترتيبها)
                </legend>
                {requests.map((value, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="flex-1">
                      <TextField
                        aria-label={`الطلب ${index + 1}`}
                        value={value}
                        maxLength={REQUEST_MAX_CHARS}
                        onChange={(event) =>
                          setRequests((prev) => prev.map((r, i) => (i === index ? event.target.value : r)))
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={`حذف الطلب ${index + 1}`}
                      onClick={() => setRequests((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
                {errors.requests ? (
                  <p role="alert" className="text-body-sm text-error">
                    {errors.requests}
                  </p>
                ) : null}
                {requests.length < REQUESTS_MAX ? (
                  <Button type="button" variant="secondary" size="sm" onClick={() => setRequests((prev) => [...prev, ''])}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    إضافة طلب
                  </Button>
                ) : null}
              </fieldset>
            ) : null}

            <div className="flex items-center gap-3">
              <Button type="submit" loading={busy} disabled={busy}>
                جهّز المسودة
              </Button>
              {result || status === 'error' ? (
                <Button type="button" variant="ghost" onClick={handleReset}>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  مذكرة جديدة
                </Button>
              ) : null}
            </div>
          </form>

          <div className="mt-6 space-y-4" aria-live="polite">
            {busy ? (
              <div className="space-y-4">
                <ProgressSteps steps={PROGRESS_STEPS} currentIndex={progressIndex} />
                <CitationCardSkeleton />
              </div>
            ) : null}

            {status === 'error' && errorMessage ? (
              <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-border-default bg-surface p-5">
                <div className="flex items-start gap-2">
                  <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-error" aria-hidden="true" />
                  <p className="text-body text-text-primary">{errorMessage}</p>
                </div>
              </div>
            ) : null}

            {status === 'done' && result && answer ? (
              <div className="space-y-4" data-testid="memo-result">
                <div className="rounded-lg border border-border-default bg-surface p-4">
                  <p className="text-body font-semibold text-text-primary">{result.memo.title}</p>
                  <p className="mt-1 text-body-sm text-text-secondary">
                    المسودة جاهزة — راجع الأسانيد أدناه ثم نزّل المستند.
                  </p>
                  <div className="mt-3">
                    <ExportButtons kind="memos" id={result.memo.id} label="تنزيل المسودة" />
                  </div>
                </div>
                {answer.structured ? (
                  <StructuredAnswerView structured={answer.structured} citations={answer.citations} />
                ) : (
                  <p className="whitespace-pre-wrap rounded-lg border border-border-default bg-surface p-4 text-body text-text-primary">
                    {answer.answer}
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      <div className="mt-8">
        <DisclaimerBanner />
      </div>
    </main>
  );
}
