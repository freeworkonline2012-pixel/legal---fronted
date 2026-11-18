/**
 * OfficePlaybookScreen — «قواعد المكتب»: كل مكتب (حساب) يضبط قواعد تدقيق عقوده وصياغتها.
 *
 * ما يمكن فعله: تعطيل قاعدة افتراضية، تغيير درجة خطورتها، وإضافة قواعد خاصة بعبارات نصية عادية (عبارة ممنوعة تُرصد الجملة الواردة فيها،
 * أو عبارة مطلوبة يُرصد غيابها). لا تعبيرات نمطية: المطابقة بالاحتواء على النص الموحَّد (الهمزات والتشكيل لا تفرّق).
 *
 * حدود الصدق: الإعداد يُطبَّق على العقود التى تُرفع بعد الحفظ وعلى مسودات الصياغة؛ لا يعيد تقييم تقارير سبق إصدارها.
 * القواعد «ممارسة تعاقدية للمكتب» وليست نصوصاً قانونية. والمطابقة النصية لا تفهم المعنى: عبارة «تجديد تلقائى» ترصد الجملة التى تنفيه أيضاً.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ListChecks, Loader2, LogIn, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { ApiError, fetchOfficePlaybook, resetOfficePlaybook, saveOfficePlaybook } from '@/lib/api-client';
import { isAuthenticated } from '@/lib/auth';
import {
  CUSTOM_SEVERITIES,
  FAMILY_LABELS,
  KIND_LABELS,
  SEVERITIES,
  blankCustomRule,
  familiesLabel,
  phrasesToText,
  setBuiltInEnabled,
  setBuiltInSeverity,
  textToPhrases,
  toPayload,
  validateConfig,
  type CustomRuleKind,
  type OfficePlaybookView,
  type PlaybookConfig,
  type PlaybookCustomRule,
  type PlaybookSeverity,
} from '@/lib/office-playbook';
import { Button, ButtonLink } from '@/components/ui/Button';

const FIELD =
  'w-full rounded-md border border-border-default bg-surface px-3 py-2 text-body-sm text-text-primary focus:outline-none focus-visible:shadow-[0_0_0_3px_var(--color-focus-ring)]';
const SELECT = `h-11 ${FIELD} py-0`;

const errorText = (err: unknown): string => (err instanceof ApiError ? err.message : 'حدث خطأ غير متوقّع — حاول مرة أخرى.');

export function OfficePlaybookScreen() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [view, setView] = useState<OfficePlaybookView | null>(null);
  const [draft, setDraft] = useState<PlaybookConfig | null>(null);
  const [busy, setBusy] = useState<'load' | 'save' | 'reset' | null>('load');
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  // نص العبارات فى حقل الإدخال (سطر لكل عبارة) محفوظ منفصلاً كى لا يُقتطع أثناء الكتابة
  const [phraseText, setPhraseText] = useState<Record<string, string>>({});

  const adopt = useCallback((v: OfficePlaybookView) => {
    setView(v);
    setDraft(v.config);
    setPhraseText(Object.fromEntries(v.config.customRules.map((r) => [r.id, phrasesToText(r.phrases)])));
  }, []);

  useEffect(() => {
    // متعمّد: sessionStorage متاح للعميل فقط؛ القراءة أثناء hydration تكسر تطابق SSR (نفس نمط TranslationScreen)
    const ok = isAuthenticated();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthed(ok);
    if (!ok) {
      setBusy(null);
      return;
    }
    let cancelled = false;
    fetchOfficePlaybook()
      .then((v) => {
        if (!cancelled) adopt(v);
      })
      .catch((err) => {
        if (!cancelled) setErrors([errorText(err)]);
      })
      .finally(() => {
        if (!cancelled) setBusy(null);
      });
    return () => {
      cancelled = true;
    };
  }, [adopt]);

  /** الإعداد الحالى بعد دمج نصوص العبارات المكتوبة فى الحقول */
  const merged = useCallback(
    (cfg: PlaybookConfig): PlaybookConfig => ({
      ...cfg,
      customRules: cfg.customRules.map((r) => ({ ...r, phrases: textToPhrases(phraseText[r.id] ?? phrasesToText(r.phrases)) })),
    }),
    [phraseText],
  );
  const dirty = view !== null && draft !== null && JSON.stringify(merged(draft)) !== JSON.stringify(view.config);

  const edit = (next: PlaybookConfig): void => {
    setDraft(next);
    setNotice(null);
    setErrors([]);
  };

  const updateRule = (id: string, patch: Partial<PlaybookCustomRule>): void => {
    if (!draft) return;
    edit({ ...draft, customRules: draft.customRules.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  };

  const handleSave = async (): Promise<void> => {
    if (!draft || !view) return;
    const withPhrases = merged(draft);
    const problems = validateConfig(withPhrases, view.limits);
    if (problems.length > 0) {
      setErrors(problems);
      return;
    }
    setBusy('save');
    setErrors([]);
    try {
      adopt(await saveOfficePlaybook(toPayload(withPhrases)));
      setNotice('حُفظت قواعد المكتب. تُطبَّق على العقود التى تُرفع الآن فصاعداً وعلى مسودات الصياغة.');
    } catch (err) {
      setErrors(errorText(err).split('\n'));
    } finally {
      setBusy(null);
    }
  };

  const handleReset = async (): Promise<void> => {
    setBusy('reset');
    setErrors([]);
    try {
      adopt(await resetOfficePlaybook());
      setConfirmReset(false);
      setNotice('أُعيدت القواعد الافتراضية.');
    } catch (err) {
      setErrors([errorText(err)]);
    } finally {
      setBusy(null);
    }
  };

  const addRule = (): void => {
    if (!draft) return;
    const rule = blankCustomRule();
    setPhraseText((p) => ({ ...p, [rule.id]: '' }));
    edit({ ...draft, customRules: [...draft.customRules, rule] });
  };

  const removeRule = (id: string): void => {
    if (!draft) return;
    edit({ ...draft, customRules: draft.customRules.filter((r) => r.id !== id) });
  };

  const toggleFamily = (rule: PlaybookCustomRule, family: string): void => {
    const cur = rule.families ?? [];
    const next = cur.includes(family) ? cur.filter((f) => f !== family) : [...cur, family];
    updateRule(rule.id, { families: next.length === 0 ? null : next });
  };

  return (
    <main className="mx-auto w-full max-w-[860px] flex-1 px-4 pb-28 pt-6 sm:px-8 lg:pb-10">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <ListChecks className="h-10 w-10 text-primary" aria-hidden="true" />
        <h1 className="text-h2 font-bold text-text-primary">قواعد المكتب</h1>
        <p className="max-w-[640px] text-body-sm text-text-secondary">
          اضبط مواقف مكتبك التعاقدية التى تُفحص فى كل عقد وتظهر فى مسودات الصياغة: عطّل ما لا يناسبك، غيّر درجة خطورته، وأضف قواعدك بعبارات تكتبها بنفسك.
        </p>
      </div>

      {authed === false ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-border-default bg-surface p-8 text-center">
          <LogIn className="h-8 w-8 text-text-tertiary" aria-hidden="true" />
          <p className="text-body font-semibold text-text-primary">تحتاج تسجيل الدخول أولاً</p>
          <ButtonLink href="/login">تسجيل الدخول</ButtonLink>
        </div>
      ) : busy === 'load' ? (
        <div role="status" className="flex items-center justify-center gap-2 p-8 text-text-secondary">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          جارٍ تحميل قواعد المكتب…
        </div>
      ) : !view || !draft ? (
        errors.length > 0 ? (
          <p role="alert" className="rounded-md border border-error bg-surface p-4 text-body-sm text-error">
            {errors.join(' ')}
          </p>
        ) : null
      ) : (
        <div className="flex flex-col gap-6">
          <p className="rounded-md border border-border-default bg-surface-muted p-3 text-caption text-text-secondary">
            تُطبَّق التغييرات على العقود التى تُرفع بعد الحفظ وعلى مسودات الصياغة، ولا تُغيّر تقارير سبق إصدارها (يُسجَّل رقم الإعداد فى كل تدقيق).
            القواعد ممارسة تعاقدية لمكتبك وليست نصوصاً قانونية، والمطابقة نصية لا تفهم المعنى: «تجديد تلقائى» مثلاً ترصد الجملة التى تنفى التجديد أيضاً،
            فاختر عبارات دقيقة. {view.version > 0 ? `رقم الإعداد المحفوظ: ${view.version}.` : 'لم تحفظ إعداداً بعد: تعمل القواعد الافتراضية.'}
          </p>

          {errors.length > 0 ? (
            <div role="alert" className="flex gap-2 rounded-md border border-error bg-surface p-4 text-body-sm text-error">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <ul className="list-inside list-disc">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {notice ? (
            <p role="status" className="flex items-center gap-2 rounded-md border border-border-default bg-surface p-3 text-body-sm text-text-primary">
              <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
              {notice}
            </p>
          ) : null}

          <section aria-label="القواعد الافتراضية" className="rounded-lg border border-border-default bg-surface p-5">
            <h2 className="mb-1 text-h3 font-bold text-text-primary">القواعد الافتراضية</h2>
            <p className="mb-4 text-caption text-text-secondary">{view.catalog.length} قاعدة. إلغاء التفعيل يخفى ملاحظتها فقط؛ لا يغيّر بقية الفحوص.</p>
            <ul className="flex flex-col divide-y divide-border-default">
              {view.catalog.map((rule) => {
                const enabled = !draft.disabledRules.includes(rule.id);
                const severity = draft.severityOverrides[rule.id] ?? rule.severity;
                return (
                  <li key={rule.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
                    <label className="flex flex-1 cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4"
                        checked={enabled}
                        aria-label={`تفعيل: ${rule.title}`}
                        onChange={(e) => edit(setBuiltInEnabled(draft, rule.id, e.target.checked))}
                      />
                      <span>
                        <span className={`block text-body-sm ${enabled ? 'text-text-primary' : 'text-text-tertiary line-through'}`}>{rule.title}</span>
                        <span className="block text-caption text-text-tertiary">
                          {familiesLabel(rule.families)}
                          {rule.absence ? ' · يرصد الغياب' : ''}
                        </span>
                      </span>
                    </label>
                    <select
                      className={`${SELECT} sm:w-32`}
                      aria-label={`درجة: ${rule.title}`}
                      value={severity}
                      disabled={!enabled}
                      onChange={(e) => edit(setBuiltInSeverity(draft, rule, e.target.value as PlaybookSeverity))}
                    >
                      {SEVERITIES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-label="قواعد المكتب الخاصة" className="rounded-lg border border-border-default bg-surface p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-h3 font-bold text-text-primary">قواعدك الخاصة</h2>
                <p className="text-caption text-text-secondary">
                  {draft.customRules.length} من {view.limits.maxCustomRules}. عبارة واحدة فى كل سطر (حتى {view.limits.maxPhrasesPerRule})، ثلاثة أحرف على الأقل.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={addRule} disabled={draft.customRules.length >= view.limits.maxCustomRules}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                قاعدة جديدة
              </Button>
            </div>

            {draft.customRules.length === 0 ? (
              <p className="text-body-sm text-text-tertiary">لا قواعد خاصة بعد.</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {draft.customRules.map((rule, i) => (
                  <li key={rule.id} aria-label={`قاعدة خاصة ${i + 1}`} className="flex flex-col gap-3 rounded-md border border-border-default p-4">
                    <div className="flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-body-sm text-text-primary">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={rule.enabled}
                          onChange={(e) => updateRule(rule.id, { enabled: e.target.checked })}
                          aria-label={`تفعيل القاعدة الخاصة ${i + 1}`}
                        />
                        مفعّلة
                      </label>
                      <Button variant="ghost" size="sm" onClick={() => removeRule(rule.id)} aria-label={`حذف القاعدة الخاصة ${i + 1}`}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        حذف
                      </Button>
                    </div>

                    <label className="flex flex-col gap-1 text-caption text-text-secondary">
                      العنوان
                      <input
                        className={FIELD}
                        value={rule.title}
                        maxLength={view.limits.maxTitleLength}
                        onChange={(e) => updateRule(rule.id, { title: e.target.value })}
                        aria-label={`عنوان القاعدة ${i + 1}`}
                      />
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-1 text-caption text-text-secondary">
                        النوع
                        <select
                          className={SELECT}
                          value={rule.kind}
                          onChange={(e) => updateRule(rule.id, { kind: e.target.value as CustomRuleKind })}
                          aria-label={`نوع القاعدة ${i + 1}`}
                        >
                          {(Object.keys(KIND_LABELS) as CustomRuleKind[]).map((k) => (
                            <option key={k} value={k}>
                              {KIND_LABELS[k]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-caption text-text-secondary">
                        الدرجة
                        <select
                          className={SELECT}
                          value={rule.severity}
                          onChange={(e) => updateRule(rule.id, { severity: e.target.value as PlaybookSeverity })}
                          aria-label={`درجة القاعدة ${i + 1}`}
                        >
                          {CUSTOM_SEVERITIES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="flex flex-col gap-1 text-caption text-text-secondary">
                      العبارات (سطر لكل عبارة)
                      <textarea
                        className={`${FIELD} min-h-[88px]`}
                        value={phraseText[rule.id] ?? phrasesToText(rule.phrases)}
                        onChange={(e) => {
                          setPhraseText((p) => ({ ...p, [rule.id]: e.target.value }));
                          setNotice(null);
                          setErrors([]);
                        }}
                        aria-label={`عبارات القاعدة ${i + 1}`}
                      />
                    </label>

                    <fieldset className="flex flex-col gap-2">
                      <legend className="mb-1 text-caption text-text-secondary">تنطبق على (بلا اختيار = كل الأنواع)</legend>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {FAMILY_LABELS.map((f) => (
                          <label key={f.id} className="flex items-center gap-1.5 text-caption text-text-primary">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5"
                              checked={rule.families?.includes(f.id) ?? false}
                              onChange={() => toggleFamily(rule, f.id)}
                              aria-label={`${f.label} للقاعدة ${i + 1}`}
                            />
                            {f.label}
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <label className="flex flex-col gap-1 text-caption text-text-secondary">
                      الشرح (اختيارى)
                      <textarea
                        className={`${FIELD} min-h-[64px]`}
                        value={rule.explanation}
                        maxLength={view.limits.maxTextLength}
                        onChange={(e) => updateRule(rule.id, { explanation: e.target.value })}
                        aria-label={`شرح القاعدة ${i + 1}`}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-caption text-text-secondary">
                      الاقتراح (اختيارى)
                      <textarea
                        className={`${FIELD} min-h-[64px]`}
                        value={rule.suggestion}
                        maxLength={view.limits.maxTextLength}
                        onChange={(e) => updateRule(rule.id, { suggestion: e.target.value })}
                        aria-label={`اقتراح القاعدة ${i + 1}`}
                      />
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => void handleSave()} loading={busy === 'save'} disabled={busy !== null || !dirty}>
              <Save className="h-4 w-4" aria-hidden="true" />
              حفظ قواعد المكتب
            </Button>
            {confirmReset ? (
              <>
                <span className="text-body-sm text-text-secondary">ستُحذف كل تخصيصاتك وتعود القواعد الافتراضية.</span>
                <Button variant="danger" size="sm" onClick={() => void handleReset()} loading={busy === 'reset'} disabled={busy !== null}>
                  نعم، أعد الضبط
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)} disabled={busy !== null}>
                  تراجع
                </Button>
              </>
            ) : (
              <Button variant="ghost" onClick={() => setConfirmReset(true)} disabled={busy !== null || !view.customized}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                إعادة الضبط للافتراضى
              </Button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
