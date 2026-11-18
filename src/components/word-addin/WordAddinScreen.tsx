'use client';

import { useEffect, useRef, useState } from 'react';
import { FileSearch, LogOut, MessageSquarePlus, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ApiError, fetchContract, loginUser, logoutUser, uploadContract } from '@/lib/api-client';
import { clearAuthSession, getCurrentUser, getRefreshToken, isAuthenticated, setAuthSession } from '@/lib/auth';
import { describeProgress, waitForContract } from '@/lib/contract-poll';
import {
  insertComments,
  isInsideWord,
  loadOfficeJs,
  readOpenDocument,
  supportsComments,
  type InsertResult,
  type OfficeGlobal,
} from '@/lib/office-bridge';
import { planComments, summarizeContract } from '@/lib/word-addin';
import type { ContractResponse } from '@/lib/types';

type Boot = 'loading' | 'outside' | 'ready';
type Phase = 'idle' | 'working' | 'done' | 'error';

const PERSONAL_DATA_ATTESTATION =
  'أقرّ بأن المستند لا يتضمن بيانات شخصية لأطراف العقد (أسماء، أرقام قومية، عناوين، أرقام هواتف)، وأننى حذفتها أو استبدلتها بعبارات عامة.';

function messageOf(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 0) return 'تعذّر الاتصال بالخادم — تحقق من اتصالك وحاول مرة أخرى.';
    if (err.status === 401) return 'انتهت صلاحية جلستك — سجّل الدخول مرة أخرى.';
    return err.message;
  }
  return err instanceof Error && err.message ? err.message : 'حدث خطأ غير متوقّع — حاول مرة أخرى.';
}

export function WordAddinScreen() {
  const [boot, setBoot] = useState<Boot>('loading');
  const [authed, setAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canComment, setCanComment] = useState(false);
  const officeRef = useRef<OfficeGlobal | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [attested, setAttested] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contract, setContract] = useState<ContractResponse | null>(null);
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentResult, setCommentResult] = useState<InsertResult | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setAuthed(isAuthenticated());
      setIsAdmin(getCurrentUser()?.role === 'admin');
      const office = await loadOfficeJs();
      if (!alive) return;
      if (!office || !(await isInsideWord(office))) {
        setBoot('outside');
        return;
      }
      officeRef.current = office;
      setCanComment(supportsComments(office));
      setBoot('ready');
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoginBusy(true);
    setLoginError(null);
    try {
      const session = await loginUser({ email: email.trim(), password });
      setAuthSession(session);
      setPassword('');
      setAuthed(true);
      setIsAdmin(session.user.role === 'admin');
    } catch (err) {
      setLoginError(err instanceof ApiError && err.status === 401 ? 'البريد أو كلمة المرور غير صحيحة.' : messageOf(err));
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleLogout() {
    const refresh = getRefreshToken();
    clearAuthSession();
    setAuthed(false);
    setContract(null);
    setPhase('idle');
    if (refresh) await logoutUser(refresh).catch(() => undefined);
  }

  async function handleReview() {
    const office = officeRef.current;
    if (!office) return;
    if (!isAdmin && !attested) {
      setError('أقرّ أولاً بأن المستند لا يتضمن بيانات شخصية لأطراف العقد.');
      setPhase('error');
      return;
    }
    setPhase('working');
    setError(null);
    setContract(null);
    setCommentResult(null);
    setCommentError(null);
    setProgress('جارٍ قراءة المستند المفتوح…');
    try {
      const file = await readOpenDocument(office);
      setProgress('جارٍ رفع العقد…');
      const accepted = await uploadContract(file, null, { background: true });
      const done = await waitForContract(accepted, {
        fetchContract,
        sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
        now: () => Date.now(),
        onUpdate: (c) => setProgress(describeProgress(c.processing) ?? 'جارٍ التحليل…'),
        isFatal: (e) => e instanceof ApiError && [401, 403, 404].includes(e.status),
      });
      setContract(done);
      setPhase(done.status === 'processed' ? 'done' : 'error');
      if (done.status !== 'processed') setError(done.extraction_error ?? 'تعذّر تحليل العقد.');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearAuthSession();
        setAuthed(false);
      }
      setError(messageOf(err));
      setPhase('error');
    } finally {
      setProgress(null);
    }
  }

  async function handleInsertComments() {
    if (!contract) return;
    setCommentBusy(true);
    setCommentError(null);
    try {
      setCommentResult(await insertComments(planComments(contract)));
    } catch (err) {
      setCommentError(messageOf(err));
    } finally {
      setCommentBusy(false);
    }
  }

  const summary = contract ? summarizeContract(contract) : null;
  const planned = contract ? planComments(contract) : [];
  const platformUrl = typeof window !== 'undefined' ? `${window.location.origin}/contracts` : '/contracts';

  if (boot === 'loading') {
    return (
      <p role="status" className="p-4 text-body-sm text-text-secondary">
        جارٍ تحميل الإضافة…
      </p>
    );
  }

  if (boot === 'outside') {
    return (
      <section className="space-y-3 p-4" aria-label="خارج Word">
        <h1 className="text-body font-semibold">مراجعة العقود داخل Word</h1>
        <p className="text-body-sm text-text-secondary">
          هذه الصفحة تعمل داخل Microsoft Word فقط. ثبّت الإضافة من ملف المانيفست ثم افتحها من تبويب «الشريط الرئيسى» فى Word.
        </p>
        <a className="text-body-sm text-link underline underline-offset-4" href="/word-addin/manifest.xml">
          تنزيل ملف المانيفست
        </a>
      </section>
    );
  }

  return (
    <div className="space-y-4 p-4" aria-label="إضافة مراجعة العقود">
      <header className="flex items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-body font-semibold">
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          مراجعة العقود
        </h1>
        {authed ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => void handleLogout()}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            خروج
          </Button>
        ) : null}
      </header>

      {!authed ? (
        <form onSubmit={(e) => void handleLogin(e)} className="space-y-3" aria-label="تسجيل الدخول">
          <p className="text-body-sm text-text-secondary">سجّل الدخول بحسابك فى المنصة لتدقيق العقد المفتوح.</p>
          <div>
            <label htmlFor="addin-email" className="mb-1 block text-body-sm text-text-secondary">
              البريد الإلكترونى
            </label>
            <input
              id="addin-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-body-sm"
            />
          </div>
          <div>
            <label htmlFor="addin-password" className="mb-1 block text-body-sm text-text-secondary">
              كلمة المرور
            </label>
            <input
              id="addin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-body-sm"
            />
          </div>
          {loginError ? (
            <p role="alert" className="text-body-sm text-error">
              {loginError}
            </p>
          ) : null}
          <Button type="submit" loading={loginBusy} disabled={loginBusy || !email || !password}>
            دخول
          </Button>
          <p className="text-caption text-text-tertiary">
            ليس لديك حساب؟{' '}
            <a className="underline underline-offset-4" href="/login?mode=signup" target="_blank" rel="noreferrer">
              أنشئ حساباً من المنصة
            </a>
          </p>
        </form>
      ) : (
        <>
          <section className="space-y-3" aria-label="تدقيق العقد المفتوح">
            <p className="text-body-sm text-text-secondary">
              نقرأ نسخة من المستند المفتوح الآن (بما فيه تعديلاتك غير المحفوظة) ونرفعها لتدقيقها بقواعد المنصة. لا يتغير نص مستندك.
            </p>
            <p className="rounded-md bg-surface-muted px-3 py-2 text-caption text-text-secondary">
              يُرفع نص العقد إلى المنصة ويُحفظ مشفَّراً مؤقتاً أثناء التحليل، ويمر بحجب البيانات الشخصية قبل أى نداء خارجى.
            </p>
            {!isAdmin ? (
              <label className="flex items-start gap-2 text-body-sm text-text-primary">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={attested}
                  onChange={(e) => setAttested(e.target.checked)}
                  disabled={phase === 'working'}
                />
                <span>{PERSONAL_DATA_ATTESTATION}</span>
              </label>
            ) : null}
            <Button
              type="button"
              loading={phase === 'working'}
              disabled={phase === 'working' || (!isAdmin && !attested)}
              onClick={() => void handleReview()}
            >
              <FileSearch className="h-4 w-4" aria-hidden="true" />
              دقّق العقد المفتوح
            </Button>
            {phase === 'working' && progress ? (
              <p role="status" className="text-body-sm text-text-secondary">
                {progress}
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="text-body-sm text-error">
                {error}
              </p>
            ) : null}
          </section>

          {summary && contract && phase === 'done' ? (
            <section className="space-y-3 border-t border-border-default pt-4" aria-label="نتيجة التدقيق">
              <h2 className="text-body-sm font-semibold">
                النتيجة: {summary.totalClauses} بنداً
              </h2>
              <ul className="space-y-1 text-body-sm text-text-primary">
                <li>يحتاج مراجعة: {summary.needsReview}</li>
                <li>سليم: {summary.sound}</li>
                <li>بلا نص قانونى مفهرَس: {summary.noSource}</li>
                <li>
                  ملاحظات على العقد ككل: حرجة {summary.findingsBySeverity['حرج']} · عالية {summary.findingsBySeverity['عالٍ']} · متوسطة{' '}
                  {summary.findingsBySeverity['متوسط']} · منخفضة {summary.findingsBySeverity['منخفض']}
                </li>
              </ul>
              {summary.locked ? (
                <p className="rounded-md bg-warning-soft px-3 py-2 text-body-sm text-text-primary">
                  تفاصيل المراجعة مقفلة حتى إتمام الطلب من المنصة، فلا تُدرج تعليقات الآن.
                </p>
              ) : canComment ? (
                <>
                  <Button type="button" variant="secondary" loading={commentBusy} disabled={commentBusy || planned.length === 0} onClick={() => void handleInsertComments()}>
                    <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
                    أدرج الملاحظات تعليقات فى المستند ({planned.length})
                  </Button>
                  <p className="text-caption text-text-tertiary">
                    التعليقات لا تغيّر نص العقد وتُحذف من لوحة المراجعة فى Word. هى مراجعة آلية تحتاج مراجعة محامٍ قبل الاعتماد.
                  </p>
                </>
              ) : (
                <p className="text-body-sm text-text-secondary">
                  إصدار Word هذا لا يدعم إدراج التعليقات من الإضافات (يتطلب WordApi 1.4). افتح التقرير الكامل من المنصة.
                </p>
              )}
              {commentResult ? (
                <p role="status" className="text-body-sm text-text-primary">
                  أُدرج {commentResult.inserted + commentResult.general} تعليقاً
                  {commentResult.general > 0 ? ` (منها ${commentResult.general} عام على العقد ككل)` : ''}
                  {commentResult.notFound > 0 ? `؛ وتعذّر تحديد موضع ${commentResult.notFound} فراجعها فى التقرير الكامل.` : '.'}
                </p>
              ) : null}
              {commentError ? (
                <p role="alert" className="text-body-sm text-error">
                  {commentError}
                </p>
              ) : null}
              <a className="block text-body-sm text-link underline underline-offset-4" href={platformUrl} target="_blank" rel="noreferrer">
                افتح التقرير الكامل فى المنصة
              </a>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
