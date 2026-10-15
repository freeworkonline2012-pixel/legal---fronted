/**
 * TranslationScreen — «الترجمة القانونية للعقود» (عربى <-> إنجليزى).
 *
 * التدفق (يوازى «تدقيق العقود»): رفع العقد + اختيار لغة الترجمة + موافقة صريحة ← الخادم يقرأ الملف ويكشف لغته
 * بدقة ويجهّز المهمة ← ترجمة على خطوات متتابعة يقودها هذا المكوّن (كل خطوة دفعة فقرات؛ تستمر بعد تحديث الصفحة)
 * ← معاينة الفقرات + البنود الموسومة للمراجعة + ملاحظات المترجم ← تنزيل Word/PDF (ترجمة فقط أو ثنائى اللغة).
 *
 * لا منطق قانونى هنا: كشف اللغة والفحوص (أرقام/طول/نص غير مترجم) والقاموس كلها فى الخادم.
 * الخصوصية: العقد وترجمته مشفَّران ومؤقتان فى الخادم ويُحذفان فوراً بزر «احذف الآن».
 * الناتج مسودة ترجمة آلية تحتاج مراجعة مترجم/محامٍ مختص قبل أى استخدام رسمى.
 */

'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileDown, Languages, Loader2, LogIn, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import type { TranslationJob, TranslationLang, TranslationLayout, TranslationUnit } from '@/lib/types';
import {
  ApiError,
  createTranslation,
  deleteTranslation,
  downloadTranslation,
  editTranslationUnit,
  fetchTranslation,
  fetchTranslationUnits,
  stepTranslation,
} from '@/lib/api-client';
import type { ExportFormat } from '@/lib/api-client';
import { isAuthenticated } from '@/lib/auth';
import {
  ACTIVE_TRANSLATION_KEY,
  CONSENT_TEXT,
  LANG_LABELS,
  MAX_EDIT_CHARS,
  TRANSLATION_ACCEPT_ATTR,
  dirFor,
  directionLabel,
  flagLabels,
  progressPercent,
  validateTranslationFile,
} from '@/lib/translation';
import { Button, ButtonLink } from '@/components/ui/Button';

type Phase = 'form' | 'creating' | 'running' | 'paused' | 'done';

const PAGE_SIZE = 25;
const CONFLICT_WAIT_MS = 4000;
const MAX_CONFLICT_RETRIES = 8;

const SELECT_CLASSES =
  'h-11 w-full rounded-md border border-border-default bg-surface px-3 text-body-sm text-text-primary focus:outline-none focus-visible:shadow-[0_0_0_3px_var(--color-focus-ring)]';

function rememberActive(id: string | null): void {
  try {
    if (id) window.sessionStorage.setItem(ACTIVE_TRANSLATION_KEY, id);
    else window.sessionStorage.removeItem(ACTIVE_TRANSLATION_KEY);
  } catch {
    // التخزين غير متاح (وضع خاص مثلاً) — الاستئناف بعد التحديث ميزة اختيارية فقط
  }
}

function recallActive(): string | null {
  try {
    return window.sessionStorage.getItem(ACTIVE_TRANSLATION_KEY);
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function messageOf(err: unknown): string {
  return err instanceof ApiError ? err.message : 'حدث خطأ غير متوقّع — حاول مرة أخرى.';
}

export function TranslationScreen() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<Phase>('form');
  const [job, setJob] = useState<TranslationJob | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | undefined>(undefined);
  const [target, setTarget] = useState<TranslationLang>('en');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aliveRef = useRef(true);
  const runningRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileId = useId();
  const targetId = useId();
  const consentId = useId();

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const runSteps = useCallback(async (start: TranslationJob) => {
    if (runningRef.current) return;
    runningRef.current = true;
    setPhase('running');
    setError(null);
    let current = start;
    try {
      let conflicts = 0;
      while (aliveRef.current && current.status !== 'completed') {
        try {
          current = await stepTranslation(current.id);
          conflicts = 0;
          if (aliveRef.current) setJob(current);
        } catch (err) {
          // خطوة سابقة لا تزال جارية فى الخادم (مثلاً بعد تحديث الصفحة): ننتظر ونعيد
          if (err instanceof ApiError && err.status === 409 && conflicts < MAX_CONFLICT_RETRIES) {
            conflicts += 1;
            await sleep(CONFLICT_WAIT_MS);
            continue;
          }
          throw err;
        }
      }
      if (aliveRef.current && current.status === 'completed') setPhase('done');
    } catch (err) {
      if (aliveRef.current) {
        if (err instanceof ApiError && err.status === 404) {
          rememberActive(null);
          setJob(null);
          setPhase('form');
        } else {
          setPhase('paused');
        }
        setError(messageOf(err));
      }
    } finally {
      runningRef.current = false;
    }
  }, []);

  useEffect(() => {
    // متعمّد: sessionStorage متاح للعميل فقط؛ القراءة أثناء hydration تكسر تطابق SSR
    // (نفس نمط ContractsScreen/ExportButtons).
    const ok = isAuthenticated();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthed(ok);
    if (!ok) return;
    const saved = recallActive();
    if (!saved) return;
    fetchTranslation(saved)
      .then((existing) => {
        if (!aliveRef.current) return;
        setJob(existing);
        setPhase(existing.status === 'completed' ? 'done' : 'paused');
      })
      .catch(() => rememberActive(null));
  }, []);

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setError(null);
    if (!selected) {
      setFile(null);
      setFileError(undefined);
      return;
    }
    const problem = validateTranslationFile(selected);
    setFileError(problem);
    setFile(problem ? null : selected);
  }

  async function handleStart() {
    if (!file || !consent) return;
    setPhase('creating');
    setError(null);
    try {
      const created = await createTranslation(file, target, true);
      rememberActive(created.id);
      setJob(created);
      void runSteps(created);
    } catch (err) {
      setError(messageOf(err));
      setPhase('form');
    }
  }

  function handleNew() {
    rememberActive(null);
    setJob(null);
    setFile(null);
    setConsent(false);
    setError(null);
    setFileError(undefined);
    setPhase('form');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleDelete() {
    if (!job) return;
    try {
      await deleteTranslation(job.id);
      handleNew();
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) handleNew();
      else setError(messageOf(err));
    }
  }

  return (
    <main className="mx-auto w-full max-w-[860px] flex-1 px-4 pb-28 pt-6 sm:px-8 lg:pb-10">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <Languages className="h-10 w-10 text-primary" aria-hidden="true" />
        <h1 className="text-h2 font-bold text-text-primary">الترجمة القانونية للعقود</h1>
        <p className="max-w-lg text-body text-text-secondary">
          ارفع عقدك (عربى أو إنجليزى)، نفحص لغته بدقة ونترجمه ترجمة قانونية — لا حرفية — بمصطلحات موحّدة وأرقام
          مطابقة للأصل، ثم تنزّله Word أو PDF.
        </p>
      </div>

      <div
        role="note"
        className="mb-6 rounded-lg border border-warning bg-warning-soft px-4 py-3 text-body-sm text-text-primary"
      >
        الناتج ترجمة آلية مساعدة — «مسودة ترجمة تحتاج مراجعة». راجع كل رقم ومبلغ وتاريخ واسم قبل التوقيع أو التقديم
        لأى جهة؛ الأصل هو المرجع عند أى اختلاف، ولا تُعد الترجمة رأياً قانونياً.
      </div>

      {authed === false ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-border-default bg-surface p-8 text-center">
          <LogIn className="h-8 w-8 text-text-tertiary" aria-hidden="true" />
          <div>
            <p className="text-body font-semibold text-text-primary">تحتاج تسجيل الدخول أولاً</p>
            <p className="mt-1 text-body-sm text-text-secondary">
              العقد وثيقة خاصة — لا يراه أحد غيرك، ويُحفظ مشفَّراً ومؤقتاً.
            </p>
          </div>
          <ButtonLink href="/login">تسجيل الدخول</ButtonLink>
        </div>
      ) : null}

      {authed === true && (phase === 'form' || phase === 'creating') ? (
        <section aria-label="ترجمة عقد جديد" className="space-y-5 rounded-lg border border-border-default bg-surface p-4 sm:p-6">
          <div className="flex items-start gap-2 rounded-md bg-surface-muted px-3 py-3 text-body-sm text-text-secondary">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <p>
              لا يمكن ترجمة العقد دون إرسال نصه كاملاً إلى مزوّد ذكاء اصطناعى خارجى، <strong>بما فيه الأسماء والعناوين
              والأرقام</strong> (لا نحجبها لأن الترجمة تحتاجها). نحفظ العقد وترجمته مشفَّرين مؤقتاً فقط ويمكنك حذفهما فوراً.
            </p>
          </div>

          <div>
            <label htmlFor={fileId} className="mb-2 block text-body-sm text-text-secondary">
              ملف العقد (PDF أو Word أو صورة — حتى 10 ميغابايت)
            </label>
            <input
              ref={fileInputRef}
              id={fileId}
              type="file"
              accept={TRANSLATION_ACCEPT_ATTR}
              onChange={handleFile}
              disabled={phase === 'creating'}
              className="block w-full text-body-sm text-text-secondary file:ml-3 file:rounded-md file:border file:border-border-strong file:bg-surface file:px-4 file:py-2 file:text-body-sm file:text-primary"
            />
            {fileError ? (
              <p role="alert" className="mt-2 text-body-sm text-error">
                {fileError}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor={targetId} className="mb-2 block text-body-sm text-text-secondary">
              الترجمة إلى
            </label>
            <select
              id={targetId}
              value={target}
              onChange={(event) => setTarget(event.target.value as TranslationLang)}
              disabled={phase === 'creating'}
              className={SELECT_CLASSES}
            >
              <option value="en">الإنجليزية (ترجمة العقد العربى)</option>
              <option value="ar">العربية (ترجمة العقد الإنجليزى)</option>
            </select>
            <p className="mt-1 text-caption text-text-tertiary">
              نحدّد لغة العقد بأنفسنا من نصه؛ إن طابقت لغة الهدف نُنبّهك.
            </p>
          </div>

          <div className="flex items-start gap-2">
            <input
              id={consentId}
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              disabled={phase === 'creating'}
              className="mt-1 h-4 w-4"
            />
            <label htmlFor={consentId} className="text-body-sm text-text-primary">
              {CONSENT_TEXT}
            </label>
          </div>

          {error ? (
            <p role="alert" className="text-body-sm text-error">
              {error}
            </p>
          ) : null}

          <Button type="button" loading={phase === 'creating'} disabled={!file || !consent || phase === 'creating'} onClick={() => void handleStart()}>
            ابدأ الترجمة
          </Button>
          {phase === 'creating' ? (
            <p role="status" className="text-body-sm text-text-secondary">
              جارٍ قراءة العقد وفحص لغته… قد يستغرق ذلك دقيقة للصور والمستندات الممسوحة.
            </p>
          ) : null}
        </section>
      ) : null}

      {authed === true && job && (phase === 'running' || phase === 'paused') ? (
        <section aria-label="تقدم الترجمة" className="space-y-4 rounded-lg border border-border-default bg-surface p-4 sm:p-6">
          <JobHeader job={job} />
          <div>
            <div className="mb-2 flex items-center justify-between text-body-sm text-text-secondary">
              <span role="status" className="flex items-center gap-2">
                {phase === 'running' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                {phase === 'running' ? 'جارٍ الترجمة…' : 'الترجمة متوقفة'}
              </span>
              <span>
                {job.progress.done_units} / {job.progress.total_units} فقرة
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="تقدم الترجمة"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent(job)}
              className="h-3 w-full overflow-hidden rounded-full bg-surface-inset"
            >
              <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${progressPercent(job)}%` }} />
            </div>
            <p className="mt-2 text-caption text-text-tertiary">
              اترك هذه الصفحة مفتوحة حتى تكتمل الترجمة. إن أُغلقت فما أُنجز محفوظ وتكمل من حيث توقفت.
            </p>
          </div>

          {error ? (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-error bg-error-soft px-3 py-3 text-body-sm text-text-primary">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-error" aria-hidden="true" />
              <p>{error}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {phase === 'paused' ? (
              <Button type="button" onClick={() => void runSteps(job)}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {error ? 'أعد المحاولة' : 'تابع الترجمة'}
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={() => void handleDelete()} disabled={phase === 'running'}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              ألغِ واحذف العقد
            </Button>
          </div>
        </section>
      ) : null}

      {authed === true && job && phase === 'done' ? (
        <CompletedView job={job} onJobChange={setJob} onDelete={handleDelete} onNew={handleNew} deleteError={error} />
      ) : null}
    </main>
  );
}

function JobHeader({ job }: { job: TranslationJob }) {
  return (
    <div className="space-y-1">
      <h2 className="text-body font-semibold text-text-primary">{job.title}</h2>
      <p className="text-body-sm text-text-secondary">
        {directionLabel(job.source_lang, job.target_lang)}
        {job.contract_type ? ` — ${job.contract_type}` : ''}
      </p>
      <p className="text-caption text-text-tertiary">
        اللغة المكتشفة: {LANG_LABELS[job.detection.lang]} ({Math.round(job.detection.dominant_share * 100)}% من حروف العقد)
      </p>
      {job.warnings.map((w) => (
        <p key={w} role="note" className="text-body-sm text-warning">
          {w}
        </p>
      ))}
    </div>
  );
}

interface CompletedViewProps {
  job: TranslationJob;
  onJobChange: (job: TranslationJob) => void;
  onDelete: () => Promise<void>;
  onNew: () => void;
  deleteError: string | null;
}

function CompletedView({ job, onJobChange, onDelete, onNew, deleteError }: CompletedViewProps) {
  const [layout, setLayout] = useState<TranslationLayout>('translation');
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [units, setUnits] = useState<TranslationUnit[]>([]);
  const [total, setTotal] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [unitsError, setUnitsError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const targetDir = dirFor(job.target_lang);
  const sourceDir = dirFor(job.source_lang);

  async function handleDownload(format: ExportFormat) {
    setBusy(format);
    setDownloadError(null);
    try {
      await downloadTranslation(job.id, format, layout);
    } catch (err) {
      setDownloadError(messageOf(err));
    } finally {
      setBusy(null);
    }
  }

  async function loadMore(from: number) {
    setLoadingUnits(true);
    setUnitsError(null);
    try {
      const page = await fetchTranslationUnits(job.id, from, PAGE_SIZE);
      setTotal(page.total);
      setUnits((prev) => (from === 0 ? page.items : [...prev, ...page.items]));
    } catch (err) {
      setUnitsError(messageOf(err));
    } finally {
      setLoadingUnits(false);
    }
  }

  function togglePreview() {
    const next = !previewOpen;
    setPreviewOpen(next);
    if (next && units.length === 0) void loadMore(0);
  }

  async function refreshJob() {
    try {
      onJobChange(await fetchTranslation(job.id));
    } catch {
      // التحديث اختيارى: يبقى العرض السابق
    }
  }

  async function saved(updated: TranslationUnit) {
    setUnits((prev) => prev.map((u) => (u.n === updated.n ? updated : u)));
    await refreshJob();
  }

  return (
    <section aria-label="الترجمة جاهزة" className="space-y-6">
      <div className="space-y-3 rounded-lg border border-border-default bg-surface p-4 sm:p-6">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
          <JobHeader job={job} />
        </div>

        <div className="space-y-3 border-t border-border-default pt-4">
          <p className="text-body-sm font-semibold text-text-primary">تنزيل الترجمة</p>
          <fieldset className="flex flex-wrap gap-4">
            <legend className="sr-only">شكل المستند</legend>
            <label className="flex items-center gap-2 text-body-sm text-text-primary">
              <input
                type="radio"
                name="translation-layout"
                checked={layout === 'translation'}
                onChange={() => setLayout('translation')}
              />
              الترجمة فقط
            </label>
            <label className="flex items-center gap-2 text-body-sm text-text-primary">
              <input
                type="radio"
                name="translation-layout"
                checked={layout === 'bilingual'}
                onChange={() => setLayout('bilingual')}
              />
              ثنائى اللغة (الأصل بجوار الترجمة)
            </label>
          </fieldset>
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => void handleDownload('docx')} loading={busy === 'docx'} disabled={busy !== null}>
              <FileDown className="h-4 w-4" aria-hidden="true" />
              تنزيل Word
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleDownload('pdf')}
              loading={busy === 'pdf'}
              disabled={busy !== null}
            >
              <FileDown className="h-4 w-4" aria-hidden="true" />
              تنزيل PDF
            </Button>
          </div>
          {downloadError ? (
            <p role="alert" className="text-body-sm text-error">
              {downloadError}
            </p>
          ) : null}
          <p className="text-caption text-text-tertiary">
            تُحذف الترجمة من الخادم تلقائياً بعد 24 ساعة من اكتمالها. نزّلها قبل ذلك.
          </p>
        </div>
      </div>

      {job.flagged.length > 0 ? (
        <section aria-label="بنود تحتاج مراجعتك" className="space-y-3 rounded-lg border border-warning bg-warning-soft p-4 sm:p-6">
          <h2 className="flex items-center gap-2 text-body font-semibold text-text-primary">
            <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
            بنود تحتاج مراجعتك ({job.flagged.length})
          </h2>
          <p className="text-body-sm text-text-secondary">
            فحصنا الترجمة آلياً فوجدنا بنوداً قد لا تطابق الأصل تماماً. راجع كل بند وصحّحه إن لزم — يُزال الوسم عند الحفظ.
          </p>
          <ul className="space-y-3">
            {job.flagged.map((item) => (
              <FlaggedRow
                key={item.n}
                jobId={job.id}
                item={item}
                sourceDir={sourceDir}
                targetDir={targetDir}
                onSaved={saved}
              />
            ))}
          </ul>
        </section>
      ) : (
        <p className="rounded-md bg-surface-muted px-3 py-3 text-body-sm text-text-secondary">
          اجتازت كل الفقرات فحوص الأرقام والطول والاكتمال الآلية. هذا لا يغنى عن مراجعة بشرية للمعنى القانونى.
        </p>
      )}

      {job.notes.length > 0 ? (
        <section aria-label="ملاحظات المترجم" className="space-y-2 rounded-lg border border-border-default bg-surface p-4 sm:p-6">
          <h2 className="text-body font-semibold text-text-primary">ملاحظات المترجم</h2>
          <ul className="space-y-2">
            {job.notes.map((n, index) => (
              <li key={`${n.n}-${n.term}-${index}`} className="text-body-sm text-text-secondary">
                <span className="font-semibold text-text-primary">الفقرة {n.n} — {n.term}:</span> {n.note}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-label="معاينة الترجمة" className="space-y-3 rounded-lg border border-border-default bg-surface p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-body font-semibold text-text-primary">معاينة الترجمة</h2>
          <Button type="button" variant="secondary" size="sm" onClick={togglePreview} aria-expanded={previewOpen}>
            {previewOpen ? 'إخفاء المعاينة' : 'عرض المعاينة'}
          </Button>
        </div>
        {previewOpen ? (
          <div className="space-y-3">
            {units.map((u) => (
              <div key={u.n} className="grid gap-2 rounded-md border border-border-default p-3 sm:grid-cols-2">
                <p dir={sourceDir} className="whitespace-pre-wrap text-body-sm text-text-secondary">
                  {u.src}
                </p>
                <p dir={targetDir} className="whitespace-pre-wrap text-body-sm text-text-primary">
                  {u.tgt}
                </p>
              </div>
            ))}
            {unitsError ? (
              <p role="alert" className="text-body-sm text-error">
                {unitsError}
              </p>
            ) : null}
            {units.length < total ? (
              <Button type="button" variant="secondary" size="sm" loading={loadingUnits} onClick={() => void loadMore(units.length)}>
                عرض المزيد ({units.length} من {total})
              </Button>
            ) : null}
          </div>
        ) : null}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" onClick={onNew}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          ترجمة عقد آخر
        </Button>
        {confirmDelete ? (
          <>
            <Button type="button" variant="danger" onClick={() => void onDelete()}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              نعم، احذف العقد والترجمة الآن
            </Button>
            <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>
              تراجع
            </Button>
          </>
        ) : (
          <Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            احذف الآن
          </Button>
        )}
      </div>
      {deleteError ? (
        <p role="alert" className="text-body-sm text-error">
          {deleteError}
        </p>
      ) : null}
    </section>
  );
}

interface FlaggedRowProps {
  jobId: string;
  item: TranslationJob['flagged'][number];
  sourceDir: 'rtl' | 'ltr';
  targetDir: 'rtl' | 'ltr';
  onSaved: (unit: TranslationUnit) => Promise<void>;
}

function FlaggedRow({ jobId, item, sourceDir, targetDir, onSaved }: FlaggedRowProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const areaId = useId();

  async function startEdit() {
    setError(null);
    setLoading(true);
    try {
      // المقتطف المعروض مقصوص؛ نجلب النص الكامل قبل التعديل
      const page = await fetchTranslationUnits(jobId, item.n - 1, 1);
      setText(page.items[0]?.tgt ?? item.tgt);
      setEditing(true);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    const clean = text.trim();
    if (clean.length === 0 || clean.length > MAX_EDIT_CHARS) {
      setError(`نص الفقرة يجب أن يكون بين 1 و${MAX_EDIT_CHARS} حرف.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await editTranslationUnit(jobId, item.n, clean);
      setEditing(false);
      await onSaved(updated);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="space-y-2 rounded-md border border-border-default bg-surface p-3">
      <p className="text-body-sm font-semibold text-text-primary">الفقرة {item.n}</p>
      <ul className="list-disc space-y-1 pr-5 text-body-sm text-warning">
        {flagLabels(item.flags).map((label) => (
          <li key={label}>{label}</li>
        ))}
      </ul>
      <div className="grid gap-2 sm:grid-cols-2">
        <p dir={sourceDir} className="text-body-sm text-text-secondary">
          {item.src}
        </p>
        <p dir={targetDir} className="text-body-sm text-text-primary">
          {item.tgt}
        </p>
      </div>
      {editing ? (
        <div className="space-y-2">
          <label htmlFor={areaId} className="block text-body-sm text-text-secondary">
            عدّل الترجمة
          </label>
          <textarea
            id={areaId}
            dir={targetDir}
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={5}
            maxLength={MAX_EDIT_CHARS}
            className="w-full rounded-md border border-border-default bg-surface px-3 py-2 text-body-sm text-text-primary focus:outline-none focus-visible:shadow-[0_0_0_3px_var(--color-focus-ring)]"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" loading={saving} onClick={() => void save()}>
              احفظ التعديل
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
              إلغاء
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" size="sm" variant="secondary" loading={loading} onClick={() => void startEdit()}>
          راجع وعدّل
        </Button>
      )}
      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}
    </li>
  );
}
