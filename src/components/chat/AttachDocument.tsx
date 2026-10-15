/**
 * AttachDocument — «أرفق مستنداً لتوضيح سؤالك» (خيار اختيارى إلى جانب أسئلة الاستيضاح).
 *
 * التدفق: موافقة صريحة + اختيار ملف ← الخادم يقرأ المستند (ويقرؤه آلياً إن كان صورة)، يحجب البيانات
 * الشخصية الحتمية، ويقترح وقائع موثقة بمقتطف حرفى ← العميل يراجع كل واقعة (يعدّلها أو يستبعدها) ← تُعتمد
 * فتدخل الإجابة كوقائع للسائل نفسه. لا يُرسَل للمحرك نص المستند أبداً؛ وقائع راجعها العميل فقط.
 * لا شىء يُخزَّن فى الخادم (لا الملف ولا نصه).
 *
 * الشاشة تشترط حساباً (بيانات خاصة): الزائر يرى دعوة لتسجيل الدخول.
 */

'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { FileText, Loader2, Paperclip, ShieldCheck, X } from 'lucide-react';
import type { AnalyzeDocumentResponse, ClarificationAnswerPayload } from '@/lib/types';
import { ApiError, analyzeDocument } from '@/lib/api-client';
import { isAuthenticated } from '@/lib/auth';
import {
  DOCUMENT_ACCEPT_ATTR,
  MAX_FACT_VALUE_CHARS,
  initialReview,
  redactionSummary,
  toClarificationAnswers,
  validateDocumentFile,
} from '@/lib/document-facts';
import type { ReviewedFact } from '@/lib/document-facts';
import { Button } from '@/components/ui/Button';

type Phase = 'collapsed' | 'form' | 'analyzing' | 'review' | 'attached';

export interface AttachedDocumentMeta {
  docType: string;
  factsCount: number;
}

export interface AttachDocumentProps {
  /** نص السؤال الحالى — يُرسل لاختيار الوقائع الأهم فقط */
  question: string;
  disabled?: boolean;
  /** يُستدعى باعتماد الوقائع (مصفوفة غير فارغة) أو بإزالتها (مصفوفة فارغة و null) */
  onChange: (facts: ClarificationAnswerPayload[], meta: AttachedDocumentMeta | null) => void;
}

export function AttachDocument({ question, disabled = false, onChange }: AttachDocumentProps) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<Phase>('collapsed');
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [fileError, setFileError] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeDocumentResponse | null>(null);
  const [reviewed, setReviewed] = useState<ReviewedFact[]>([]);
  const [attachedCount, setAttachedCount] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const consentId = useId();
  const fileId = useId();

  useEffect(() => {
    // متعمّد: sessionStorage متاح للعميل فقط؛ القراءة أثناء hydration تكسر تطابق SSR
    // (نفس نمط ExportButtons/ContractsScreen).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthed(isAuthenticated());
  }, []);

  if (authed === null) return null;

  if (!authed) {
    return (
      <p className="text-body-sm text-text-tertiary">
        <Link href="/login" className="text-link underline underline-offset-4">
          سجّل الدخول
        </Link>{' '}
        لتتمكن من إرفاق مستند يوضّح سؤالك.
      </p>
    );
  }

  function reset() {
    setPhase('collapsed');
    setFile(null);
    setConsent(false);
    setFileError(undefined);
    setError(null);
    setResult(null);
    setReviewed([]);
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setError(null);
    if (!selected) {
      setFile(null);
      setFileError(undefined);
      return;
    }
    const problem = validateDocumentFile(selected);
    setFileError(problem);
    setFile(problem ? null : selected);
  }

  async function handleAnalyze() {
    if (!file || !consent) return;
    setPhase('analyzing');
    setError(null);
    try {
      const response = await analyzeDocument(file, true, question);
      setResult(response);
      setReviewed(initialReview(response.facts));
      setPhase('review');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذّر تحليل المستند — حاول مرة أخرى أو اكتب الوقائع يدوياً.');
      setPhase('form');
    }
  }

  function handleConfirm() {
    const answers = toClarificationAnswers(reviewed);
    if (answers.length === 0) return;
    setAttachedCount(answers.length);
    setPhase('attached');
    onChange(answers, { docType: result?.doc_type ?? '', factsCount: answers.length });
  }

  function handleRemove() {
    reset();
    onChange([], null);
  }

  const selectedCount = toClarificationAnswers(reviewed).length;

  if (phase === 'collapsed') {
    return (
      <div>
        <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => setPhase('form')}>
          <Paperclip className="h-4 w-4" aria-hidden="true" />
          أرفق مستنداً لتوضيح سؤالك
        </Button>
      </div>
    );
  }

  if (phase === 'attached') {
    return (
      <div
        className="flex items-center justify-between gap-3 rounded-md border border-success bg-success-soft px-4 py-2"
        data-testid="document-attached"
      >
        <span className="flex items-center gap-2 text-body-sm text-text-primary">
          <FileText className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
          أُرفقت {attachedCount} وقائع من المستند{result?.doc_type ? ` (${result.doc_type})` : ''} — ستُبنى الإجابة عليها.
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={handleRemove} disabled={disabled}>
          <X className="h-4 w-4" aria-hidden="true" />
          إزالة
        </Button>
      </div>
    );
  }

  return (
    <section
      aria-label="إرفاق مستند"
      className="space-y-4 rounded-lg border border-border-default bg-surface p-4"
      data-testid="attach-document"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="flex items-center gap-2 text-body font-semibold text-text-primary">
          <Paperclip className="h-4 w-4" aria-hidden="true" />
          مستند يوضّح سؤالك
        </h2>
        <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={phase === 'analyzing'}>
          <X className="h-4 w-4" aria-hidden="true" />
          إلغاء
        </Button>
      </div>

      {phase === 'form' ? (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-md bg-surface-muted px-3 py-3 text-body-sm text-text-secondary">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <p>
              نقرأ المستند ونقترح منه وقائع تراجعها أنت قبل اعتمادها؛ ولا نحتفظ بالملف ولا بنصه. نحجب تلقائياً الأرقام
              القومية والهواتف والبريد والحسابات البنكية قبل أى معالجة، <strong>لكن لا نحجب الأسماء والعناوين</strong> —
              احجبها من المستند قبل رفعه إن أردت. الأنسب: عقد، إنذار، صحيفة دعوى، قرار، أو إيصال.
            </p>
          </div>

          <div>
            <label htmlFor={fileId} className="mb-2 block text-body-sm text-text-secondary">
              الملف (PDF أو Word أو صورة — حتى 8 ميغابايت)
            </label>
            <input
              ref={inputRef}
              id={fileId}
              type="file"
              accept={DOCUMENT_ACCEPT_ATTR}
              onChange={handleFile}
              className="block w-full text-body-sm text-text-secondary file:ml-3 file:rounded-md file:border file:border-border-strong file:bg-surface file:px-4 file:py-2 file:text-body-sm file:text-primary"
            />
            {fileError ? (
              <p role="alert" className="mt-2 text-body-sm text-error">
                {fileError}
              </p>
            ) : null}
          </div>

          <div className="flex items-start gap-2">
            <input
              id={consentId}
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <label htmlFor={consentId} className="text-body-sm text-text-primary">
              أوافق على قراءة هذا المستند آلياً وإرسال نصه (بعد حجب البيانات المذكورة) إلى مزوّد ذكاء اصطناعى خارجى
              لاستخراج الوقائع منه.
            </label>
          </div>

          {error ? (
            <p role="alert" className="text-body-sm text-error">
              {error}
            </p>
          ) : null}

          <Button type="button" onClick={() => void handleAnalyze()} disabled={!file || !consent || disabled}>
            حلّل المستند
          </Button>
        </div>
      ) : null}

      {phase === 'analyzing' ? (
        <p className="flex items-center gap-2 text-body-sm text-text-secondary" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          جارٍ قراءة المستند واستخراج الوقائع… قد يستغرق ذلك دقيقة للصور والمستندات الممسوحة.
        </p>
      ) : null}

      {phase === 'review' && result ? (
        <div className="space-y-4">
          <div className="space-y-1 text-body-sm text-text-secondary">
            <p>
              {result.doc_type ? `نوع المستند: ${result.doc_type}. ` : ''}
              {result.redactions_total > 0
                ? `حجبنا قبل المعالجة: ${redactionSummary(result.redactions)}.`
                : 'لم نجد بيانات شخصية حتمية لنحجبها (الأسماء والعناوين لا تُحجب تلقائياً).'}
            </p>
            {result.warnings.map((w) => (
              <p key={w} role="note" className="text-warning">
                {w}
              </p>
            ))}
          </div>

          {reviewed.length === 0 ? (
            <p className="rounded-md bg-surface-muted px-3 py-3 text-body-sm text-text-secondary">
              لم نستخرج وقائع موثقة من هذا المستند. اكتب الوقائع فى سؤالك أو جرّب مستنداً أوضح.
            </p>
          ) : (
            <ul className="space-y-3">
              {reviewed.map((r, index) => (
                <li key={`${r.fact.label}-${index}`} className="space-y-2 rounded-md border border-border-default p-3">
                  <label className="flex items-center gap-2 text-body-sm font-semibold text-text-primary">
                    <input
                      type="checkbox"
                      checked={r.included}
                      aria-label={`اعتماد: ${r.fact.label}`}
                      onChange={(event) =>
                        setReviewed((prev) =>
                          prev.map((x, i) => (i === index ? { ...x, included: event.target.checked } : x)),
                        )
                      }
                      className="h-4 w-4"
                    />
                    {r.fact.label}
                  </label>
                  <input
                    type="text"
                    value={r.value}
                    maxLength={MAX_FACT_VALUE_CHARS}
                    aria-label={`قيمة: ${r.fact.label}`}
                    onChange={(event) =>
                      setReviewed((prev) => prev.map((x, i) => (i === index ? { ...x, value: event.target.value } : x)))
                    }
                    className="h-11 w-full rounded-md border border-border-default bg-surface px-3 text-body-sm text-text-primary focus:outline-none focus-visible:shadow-[0_0_0_3px_var(--color-focus-ring)]"
                  />
                  <p className="text-caption text-text-tertiary">من المستند: «{r.fact.quote}»</p>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={handleConfirm} disabled={selectedCount === 0}>
              اعتمد الوقائع المحددة ({selectedCount})
            </Button>
            <Button type="button" variant="ghost" onClick={reset}>
              تجاهل المستند
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
