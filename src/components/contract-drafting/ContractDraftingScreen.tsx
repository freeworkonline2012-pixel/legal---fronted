/**
 * ContractDraftingScreen — «صياغة العقود» (الخدمة الأولى ضمن «العقود القانونية»).
 *
 * قرار المنتج (2026-11-18): الصياغة حتمية بالكامل على الخادم — قوالب بنود محكَّمة تُملأ بإجابات المستخدم، بلا نموذج
 * لغوى ولا أى نداء خارجى، فلا تغادر بيانات الأطراف المنصة ولا يُخزَّن شىء منها (التنزيل يعيد التوليد من الإجابات نفسها).
 * كل مسودة تمر على بوابة جودة تستعمل قواعد تدقيق العقود نفسها. الناتج مسودة دائماً تحتاج مراجعة محامٍ قبل التوقيع.
 *
 * هذه الشاشة لا تحتوى أى منطق قانونى: الأسئلة والاختيارات والافتراضيات والتحقق والنص كلها من الخادم.
 * الأنواع المدعومة حالياً: عقد خدمات، عقد إيجار، اتفاقية سرية (يضيف الخادم أنواعاً جديدة بلا تغيير هنا).
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileDown, FilePenLine, LogIn, RefreshCw, WifiOff } from 'lucide-react';
import { ApiError, DraftFieldError, downloadCustomDraft, downloadDraft, fetchDraftTypes, generateCustomDraft, generateDraft } from '@/lib/api-client';
import { isAuthenticated } from '@/lib/auth';
import {
  type DraftAnswers,
  type DraftField,
  type DraftResult,
  type DraftTypeSpec,
  buildAnswers,
  countBlanks,
  groupFields,
  initialAnswers,
  missingRequired,
  sortFindings,
  visibleFields,
  withClauseTitle,
  withParagraph,
} from '@/lib/drafting';
import { Button, ButtonLink } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/TextArea';
import { TextField } from '@/components/ui/TextField';

type TypesStatus = 'loading' | 'ready' | 'error';

const SELECT_CLASSES =
  'h-11 w-full rounded-md border border-border-default bg-surface px-3 text-body-sm text-text-primary focus:outline-none focus-visible:shadow-[0_0_0_3px_var(--color-focus-ring)] disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled-text';

function FieldInput({
  field,
  value,
  error,
  disabled,
  onChange,
}: {
  field: DraftField;
  value: string;
  error?: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  const label = field.required ? field.label : `${field.label} (اختيارى)`;
  const helper = !error ? field.help : undefined;
  if (field.kind === 'choice') {
    const id = `draft-${field.id}`;
    return (
      <div>
        <label htmlFor={id} className="mb-2 block text-body-sm text-text-secondary">
          {label}
        </label>
        <select
          id={id}
          value={value}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={SELECT_CLASSES}
        >
          {!field.required || value === '' ? <option value="">{field.required ? 'اختر…' : '—'}</option> : null}
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {field.help && !error ? <p className="mt-1 text-caption text-text-tertiary">{field.help}</p> : null}
        {error ? (
          <p role="alert" className="mt-1 text-body-sm text-error">
            {error}
          </p>
        ) : null}
      </div>
    );
  }
  if (field.kind === 'longtext') {
    return (
      <TextArea
        label={label}
        value={value}
        rows={3}
        maxLength={field.maxLength}
        disabled={disabled}
        error={error}
        helper={helper}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  const numeric = field.kind === 'number' || field.kind === 'money';
  return (
    <TextField
      label={label}
      value={value}
      type={field.kind === 'date' ? 'date' : 'text'}
      inputMode={numeric ? 'decimal' : undefined}
      maxLength={field.maxLength}
      disabled={disabled}
      error={error}
      helper={helper}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function ContractDraftingScreen() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [typesStatus, setTypesStatus] = useState<TypesStatus>('loading');
  const [types, setTypes] = useState<DraftTypeSpec[]>([]);
  const [typeId, setTypeId] = useState<string | null>(null);
  const [role, setRole] = useState('');
  const [answers, setAnswers] = useState<DraftAnswers>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState<'pdf' | 'docx' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<DraftResult | null>(null);
  // «عقد آخر»: النص قابل للتحرير قبل التنزيل؛ `edited` هو ما يُنزَّل
  const [edited, setEdited] = useState<DraftResult | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    // متعمّد: sessionStorage متاح للعميل فقط (نفس نمط بقية الشاشات)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthed(isAuthenticated());
  }, []);

  const loadTypes = useCallback(async () => {
    setTypesStatus('loading');
    try {
      setTypes(await fetchDraftTypes());
      setTypesStatus('ready');
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'تعذّر تحميل أنواع العقود.');
      setTypesStatus('error');
    }
  }, []);

  useEffect(() => {
    if (authed === true) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadTypes();
    }
  }, [authed, loadTypes]);

  const spec = types.find((t) => t.id === typeId) ?? null;

  function chooseType(next: DraftTypeSpec) {
    setTypeId(next.id);
    setRole(next.roles[0]?.value ?? '');
    setAnswers(initialAnswers(next));
    setFieldErrors({});
    setMessage(null);
    setResult(null);
    setEdited(null);
    setEditing(false);
  }

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    if (fieldErrors[id]) setFieldErrors((prev) => ({ ...prev, [id]: '' }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!spec) return;
    const missing = missingRequired(spec, answers);
    setFieldErrors(missing);
    setMessage(null);
    if (Object.keys(missing).length > 0) {
      setMessage('أكمل الحقول المطلوبة المعلَّمة أولاً.');
      return;
    }
    setBusy(true);
    try {
      const clean = buildAnswers(spec, answers);
      const draft = spec.assisted ? await generateCustomDraft({ role, answers: clean }) : await generateDraft({ type: spec.id, role, answers: clean });
      setResult(draft);
      setEdited(draft);
      setEditing(false);
    } catch (err) {
      if (err instanceof DraftFieldError) setFieldErrors(err.fieldErrors);
      setMessage(err instanceof ApiError ? err.message : 'حدث خطأ غير متوقّع — حاول مرة أخرى.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload(format: 'pdf' | 'docx') {
    if (!spec) return;
    setDownloading(format);
    setMessage(null);
    try {
      if (spec.assisted) await downloadCustomDraft(edited ?? result!, format);
      else await downloadDraft({ type: spec.id, role, answers: buildAnswers(spec, answers) }, format);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'تعذّر تنزيل المسودة — حاول مرة أخرى.');
    } finally {
      setDownloading(null);
    }
  }

  function backToForm() {
    setResult(null);
    setEdited(null);
    setEditing(false);
    setMessage(null);
  }

  function startOver() {
    setResult(null);
    setEdited(null);
    setEditing(false);
    setTypeId(null);
    setAnswers({});
    setFieldErrors({});
    setMessage(null);
  }

  const groups = spec ? groupFields(visibleFields(spec, answers)) : [];
  const shown = edited ?? result;
  const blanks = shown ? countBlanks(shown) : 0;

  return (
    <main className="mx-auto w-full max-w-[860px] flex-1 px-4 pb-28 pt-6 sm:px-8 lg:pb-10">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <FilePenLine className="h-10 w-10 text-primary" aria-hidden="true" />
        <h1 className="text-h2 font-bold text-text-primary">صياغة العقود</h1>
        <p className="max-w-lg text-body text-text-secondary">
          اختر نوع العقد وأجب عن الأسئلة، فنجهّز لك مسودة مرقّمة البنود وفق قوالب محكَّمة، ونفحصها بقواعد مراجعة العقود
          نفسها قبل تسليمها.
        </p>
      </div>

      {authed === false ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-border-default bg-surface p-8 text-center">
          <LogIn className="h-8 w-8 text-text-tertiary" aria-hidden="true" />
          <div>
            <p className="text-body font-semibold text-text-primary">تحتاج تسجيل الدخول أولاً</p>
            <p className="mt-1 text-body-sm text-text-secondary">صياغة العقود وتنزيلها متاحان للمستخدمين المسجَّلين.</p>
          </div>
          <ButtonLink href="/login">تسجيل الدخول</ButtonLink>
        </div>
      ) : authed === true ? (
        <>
          {typesStatus === 'loading' ? (
            <p role="status" className="text-center text-body-sm text-text-secondary">
              جارٍ تحميل أنواع العقود…
            </p>
          ) : null}

          {typesStatus === 'error' ? (
            <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-border-default bg-surface p-6 text-center">
              <WifiOff className="h-7 w-7 text-text-tertiary" aria-hidden="true" />
              <p className="text-body-sm text-text-primary">{message ?? 'تعذّر تحميل أنواع العقود.'}</p>
              <Button type="button" variant="secondary" onClick={() => void loadTypes()}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                إعادة المحاولة
              </Button>
            </div>
          ) : null}

          {typesStatus === 'ready' && !result ? (
            <section className="mb-6">
              <label htmlFor="draft-type" className="mb-3 block text-body font-semibold text-text-primary">
                ١. اختر نوع العقد
              </label>
              <select
                id="draft-type"
                value={typeId ?? ''}
                disabled={busy}
                onChange={(e) => {
                  const next = types.find((t) => t.id === e.target.value);
                  if (next) chooseType(next);
                }}
                className={SELECT_CLASSES}
              >
                {typeId === null ? <option value="">اختر نوع العقد…</option> : null}
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              {spec ? <p className="mt-2 text-body-sm text-text-secondary">{spec.description}</p> : null}
            </section>
          ) : null}

          {typesStatus === 'ready' && spec && !result ? (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6" noValidate>
              <section aria-label="صفتك">
                <h2 className="mb-3 text-body font-semibold text-text-primary">٢. صفتك فى العقد</h2>
                <label htmlFor="draft-role" className="mb-2 block text-body-sm text-text-secondary">
                  أنا
                </label>
                <select id="draft-role" value={role} disabled={busy} onChange={(e) => setRole(e.target.value)} className={SELECT_CLASSES}>
                  {spec.roles.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-caption text-text-tertiary">
                  تحدد صفتك الطرف الذى تُراجَع من جهته توازنات المسودة؛ الأحكام نفسها تسرى على الطرفين.
                </p>
              </section>

              <h2 className="text-body font-semibold text-text-primary">٣. بيانات العقد</h2>
              {spec.assisted ? (
                <p role="note" className="rounded-lg border border-border-default bg-surface px-4 py-3 text-body-sm text-text-secondary">
                  بنود موضوع هذا العقد يصوغها نموذج لغوى من وصفك. أسماء الأطراف وعناوينهم وممثلوهم لا تُرسل للنموذج أبداً، وأى رقم قومى أو هاتف أو حساب بنكى فى وصفك يوقف الطلب. النموذج لا يضيف أى رقم أو مبلغ أو مدة من عنده: ما لم تكتبه فى «الأرقام والشروط الجوهرية» يظهر فراغاً [____] لتملأه، ولا يستشهد بأى مادة قانونية. قد تستغرق الصياغة نحو نصف دقيقة.
                </p>
              ) : null}
              {groups.map((g) => (
                <fieldset key={g.group} className="space-y-4 rounded-lg border border-border-default bg-surface p-4" disabled={busy}>
                  <legend className="px-2 text-body-sm font-semibold text-text-primary">{g.group}</legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {g.fields.map((f) => (
                      <div key={f.id} className={f.kind === 'longtext' ? 'sm:col-span-2' : undefined}>
                        <FieldInput
                          field={f}
                          value={answers[f.id] ?? ''}
                          error={fieldErrors[f.id] || undefined}
                          disabled={busy}
                          onChange={(v) => setAnswer(f.id, v)}
                        />
                      </div>
                    ))}
                  </div>
                </fieldset>
              ))}

              {message ? (
                <p role="alert" className="text-body-sm text-error">
                  {message}
                </p>
              ) : null}

              <div className="flex items-center gap-3">
                <Button type="submit" loading={busy} disabled={busy}>
                  جهّز المسودة
                </Button>
                {busy && spec.assisted ? (
                  <span role="status" className="text-body-sm text-text-secondary">
                    جارٍ صياغة البنود وفحصها… قد يستغرق نحو نصف دقيقة.
                  </span>
                ) : null}
                <Button type="button" variant="ghost" onClick={startOver} disabled={busy}>
                  تغيير نوع العقد
                </Button>
              </div>
            </form>
          ) : null}

          {shown ? (
            <section aria-label="المسودة" className="space-y-6">
              <header className="space-y-1">
                <h2 className="text-h3 font-bold text-text-primary">{shown.title}</h2>
                <p className="text-body-sm text-text-secondary">{shown.typeLabel} — مسودة تحتاج مراجعة محامٍ</p>
              </header>

              {shown.assisted ? (
                <div role="note" className="space-y-1 rounded-lg border border-warning bg-warning-soft p-4 text-body-sm text-text-primary">
                  <p className="font-semibold">بنود موضوع العقد صاغها نموذج لغوى — تحتاج مراجعة محامٍ متخصص.</p>
                  <p className="text-text-secondary">
                    فُحصت آلياً (لا استشهادات ولا أرقام غير واردة فى إجاباتك، ولا شروط تخالف قواعد آمرة تعرفها المنصة) لكن هذا ليس مراجعة قانونية.
                    {blanks > 0 ? ` يوجد ${blanks} فراغ [____] ينتظر أن تملأه أو تحذفه قبل التوقيع.` : ' لا فراغات متبقية.'}
                  </p>
                </div>
              ) : null}

              {shown.assisted && result && edited && JSON.stringify(edited.clauses) !== JSON.stringify(result.clauses) ? (
                <p role="note" className="text-body-sm text-text-secondary">
                  عدّلت النص: نتيجة الفحص أدناه للنص الأصلى قبل تعديلك؛ يُعاد فحص النص المعدَّل عند التنزيل.
                </p>
              ) : null}

              <div
                role="status"
                className={`flex items-start gap-3 rounded-lg border p-4 text-body-sm ${
                  shown.quality.passed ? 'border-success bg-success-soft text-text-primary' : 'border-warning bg-warning-soft text-text-primary'
                }`}
              >
                {shown.quality.passed ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
                )}
                <div className="space-y-2">
                  <p className="font-semibold">
                    {shown.quality.passed
                      ? 'اجتازت المسودة فحص الجودة الآلى بلا ملاحظات.'
                      : `فحص الجودة الآلى سجّل ${shown.quality.findings.length} ملاحظة تستوجب انتباهك.`}
                  </p>
                  <p className="text-text-secondary">الفحص آلى ولا يغنى عن مراجعة المحامى.</p>
                  {shown.quality.findings.length > 0 ? (
                    <ul className="list-disc space-y-1 ps-5">
                      {sortFindings(shown.quality.findings).map((f, i) => (
                        <li key={i}>
                          <strong>
                            [{f.severity}] {f.title}
                          </strong>{' '}
                          — {f.detail}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>

              <article aria-label="نص العقد" className="space-y-4 rounded-lg border border-border-default bg-surface p-5 text-body leading-8 text-text-primary">
                {shown.preamble.map((p, i) => (
                  <p key={`pre-${i}`}>{p}</p>
                ))}
                {shown.clauses.map((c, ci) => (
                  <section key={c.number} aria-label={c.heading} className="space-y-2">
                    {editing && shown.assisted ? (
                      <TextField
                        aria-label={`عنوان ${c.heading}`}
                        value={c.title}
                        maxLength={80}
                        onChange={(e) => setEdited((prev) => (prev ? withClauseTitle(prev, ci, e.target.value) : prev))}
                      />
                    ) : (
                      <h3 className="text-body font-bold">
                        {c.heading}: {c.title}
                      </h3>
                    )}
                    {c.paragraphs.map((p, i) =>
                      editing && shown.assisted ? (
                        <TextArea
                          key={i}
                          aria-label={`${c.heading} — فقرة ${i + 1}`}
                          value={p}
                          rows={3}
                          maxLength={3000}
                          onChange={(e) => setEdited((prev) => (prev ? withParagraph(prev, ci, i, e.target.value) : prev))}
                        />
                      ) : p.startsWith('- ') ? (
                        <p key={i} className="ps-4">
                          • {p.slice(2)}
                        </p>
                      ) : (
                        <p key={i}>{p}</p>
                      ),
                    )}
                  </section>
                ))}
                {shown.closing.map((p, i) => (
                  <p key={`close-${i}`}>{p}</p>
                ))}
              </article>

              <section aria-label="ملاحظات المراجعة للمحامى" className="rounded-lg border border-border-default bg-surface p-5">
                <h3 className="mb-2 text-body font-bold text-text-primary">ملاحظات للمحامى (ليست من نص العقد)</h3>
                <ol className="list-decimal space-y-1 ps-5 text-body-sm text-text-secondary">
                  {shown.lawyerNotes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ol>
              </section>

              {message ? (
                <p role="alert" className="text-body-sm text-error">
                  {message}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" loading={downloading === 'docx'} disabled={downloading !== null} onClick={() => void handleDownload('docx')}>
                  <FileDown className="h-4 w-4" aria-hidden="true" />
                  تنزيل Word
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  loading={downloading === 'pdf'}
                  disabled={downloading !== null}
                  onClick={() => void handleDownload('pdf')}
                >
                  <FileDown className="h-4 w-4" aria-hidden="true" />
                  تنزيل PDF
                </Button>
                {shown.assisted ? (
                  <Button type="button" variant="secondary" onClick={() => setEditing((v) => !v)} aria-pressed={editing}>
                    {editing ? 'إنهاء تحرير النص' : 'تحرير نص البنود'}
                  </Button>
                ) : null}
                <Button type="button" variant="ghost" onClick={backToForm}>
                  تعديل الإجابات
                </Button>
                <Button type="button" variant="ghost" onClick={startOver}>
                  عقد جديد
                </Button>
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
