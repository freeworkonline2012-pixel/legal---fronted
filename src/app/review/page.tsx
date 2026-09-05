'use client';

/**
 * صفحة طابور المراجعة البشرية — واجهة المحامي الداخلي (S-09 في wireframes + EP-06).
 *
 * - شاشة مقسمة واحدة: السؤال/الإجابة/المصدر في نظر واحد (أولوية UX #13).
 * - اختصارات لوحة مفاتيح: [1] اعتماد [2] رفض [3] اقتراح تعديل (شخصية 3).
 * - حالات: تحميل / فارغة / خطأ (401 ← تسجيل دخول، 403 ← صلاحيات، شبكة ← إعادة
 *   محاولة أو معاينة تجريبية صريحة) — لا طريق مسدود.
 *
 * الربط بـ backend (EP-06): GET /api/reviews?status=pending (lawyer/admin)
 * + PATCH /api/reviews/{id} عند الحسم. تحويل عقد backend إلى شكل العرض يتم عبر
 * src/lib/review.ts (اشتقاق الأولوية من الثقة + تطبيع category الدفاعي).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Inbox,
  Scale,
  ShieldAlert,
  XCircle,
  PencilLine,
} from 'lucide-react';
import type { ReviewQueueItem, ReviewResolveStatus } from '@/lib/types';
import { DEMO_REVIEW_ITEMS } from '@/lib/demo-data';
import { fetchReviewQueue, resolveReview } from '@/lib/api-client';
import { mapReviewItem } from '@/lib/review';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/TextArea';
import { DomainChip } from '@/components/ui/DomainChip';
import { CitationCard } from '@/components/ui/CitationCard';
import { useToast } from '@/components/ui/Toast';
import { domainChipTokens } from '@/lib/tokens';

type ReviewAction = 'approve' | 'reject' | 'suggest_edit';

/** تخطيط إجراء الواجهة إلى حالة الحسم في عقد backend (UpdateReviewDto) */
const ACTION_TO_STATUS: Record<ReviewAction, ReviewResolveStatus> = {
  approve: 'approved',
  reject: 'rejected',
  suggest_edit: 'needs_changes',
};

const PRIORITY_LABELS: Record<ReviewQueueItem['priority'], string> = {
  low_confidence: 'ثقة منخفضة',
  medium_confidence: 'ثقة متوسطة',
  daily_sample: 'عينة يومية',
};

const PRIORITY_CLASSES: Record<ReviewQueueItem['priority'], string> = {
  low_confidence: 'bg-error-soft text-error border-error',
  medium_confidence: 'bg-warning-soft text-warning border-warning',
  daily_sample: 'bg-primary-soft text-primary border-primary-border',
};

export default function ReviewPage() {
  const { showToast } = useToast();
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  // صنف الخطأ: 401 (غير مصادق) / 403 (صلاحيات ناقصة) / شبكة أو غيره
  const [errorKind, setErrorKind] = useState<'auth' | 'forbidden' | 'network' | null>(null);
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState(false);
  // حارس متزامن ضد التنشيط المزدوج: `processing` في closure مستمع لوحة
  // المفاتيح قد تكون قديمة (stale) عند الضغط السريع المتكرر خلال نافذة
  // المعالجة — ref يُقرأ/يُحدَّث تزامناً عند الاستدعاء فيُتجاهل الاستدعاء
  // الثاني فوراً (يمنع ضخّ «إحصاءات اليوم»).
  const processingRef = useRef(false);
  // عدّاد المراجعات المُحسومة في هذه الجلسة — يُحتسب من عمليات الحسم الفعلية.
  const [doneCount, setDoneCount] = useState(0);
  // هل نعرض معاينة تجريبية (فشل اتصال)؟ — تُعرض ببانر تحذيري صريح.
  const [isDemo, setIsDemo] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    setState('loading');
    setErrorKind(null);
    setIsDemo(false);
    try {
      const data = await fetchReviewQueue('pending');
      const mapped = data.items
        .map(mapReviewItem)
        .filter((item): item is ReviewQueueItem => item !== null);
      setItems(mapped);
      setActiveId((prev) => prev ?? mapped[0]?.id ?? null);
      setState('ready');
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('401')) setErrorKind('auth');
      else if (message.includes('403')) setErrorKind('forbidden');
      else setErrorKind('network');
      setState('error');
    }
  }, []);

  useEffect(() => {
    // متعمّد: جلب بيانات غير متزامن؛ كل استدعاءات setState داخل load() تحدث في
    // استدعاءات وعود بعد اكتمال الطلب — النمط الموثّق لجلب البيانات عند التركيب.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const activeItem = items.find((item) => item.id === activeId) ?? null;

  function loadDemo() {
    setItems(DEMO_REVIEW_ITEMS);
    setIsDemo(true);
    setActiveId((prev) => prev ?? DEMO_REVIEW_ITEMS[0]?.id ?? null);
    setState('ready');
  }

  const performAction = useCallback(
    async (action: ReviewAction) => {
      if (!activeItem || processingRef.current) return;
      processingRef.current = true;
      setProcessing(true);
      const trimmedNote = note.trim();
      try {
        await resolveReview(activeItem.id, {
          status: ACTION_TO_STATUS[action],
          ...(trimmedNote ? { review_note: trimmedNote } : {}),
        });
        const messages: Record<ReviewAction, string> = {
          approve: 'تم اعتماد الإجابة — ستُغذّي تحسين النظام.',
          reject: 'تم رفض الإجابة — سيعاد توليدها أو تُحال للمراجعة.',
          suggest_edit: 'تم تسجيل التعديل المقترح.',
        };
        showToast('success', messages[action]);
        setItems((prev) => prev.filter((item) => item.id !== activeItem.id));
        setDoneCount((prev) => prev + 1);
        setActiveId((prev) => {
          if (prev !== activeItem.id) return prev;
          const remaining = items.filter((item) => item.id !== activeItem.id);
          return remaining[0]?.id ?? null;
        });
        setNote('');
      } catch {
        // فشل الحسم — لا نزيل العنصر، نُظهر خطأً واضحاً (لا يختفي تلقائياً)
        showToast('error', 'تعذّر حفظ المراجعة — تحقق من الاتصال ثم أعد المحاولة.');
      } finally {
        processingRef.current = false;
        setProcessing(false);
      }
    },
    [activeItem, note, items, showToast],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // لا تُفعَّل الاختصارات أثناء الكتابة داخل حقل/منطقة نصية — تمنع اعتماد/رفض
      // عنصر عن طريق الخطأ أثناء كتابة ملاحظة.
      const target = event.target as HTMLElement | null;
      const isEditable =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable;
      if (isEditable) return;

      if (event.key === '1') void performAction('approve');
      if (event.key === '2') void performAction('reject');
      if (event.key === '3') {
        void performAction('suggest_edit');
        noteRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // performAction يحمل closure محدّثاً (useCallback يعتمد على activeItem/note/items)
  }, [performAction]);

  return (
    <div className="flex min-h-screen flex-col bg-background font-ui text-text-primary">
      <Header />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 pb-28 sm:px-8 lg:pb-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" aria-hidden="true" />
            <h1 className="text-h2 font-bold text-text-primary">لوحة المراجعة القانونية</h1>
          </div>
          <div className="flex items-center gap-4 text-body-sm text-text-secondary">
            <span>
              إحصاءات اليوم: <strong className="text-text-primary">{doneCount} مراجعة</strong>
            </span>
            <span>
              المتبقي: <strong className="text-text-primary">{items.length}</strong>
            </span>
          </div>
        </div>

        {isDemo ? (
          <p role="status" className="mt-4 rounded-md bg-warning-soft px-3 py-2 text-body-sm text-warning">
            تعذّر الاتصال بالخادم — تعرض عناصر تجريبية للمعاينة فقط (ليست طابوراً حقيقياً).
          </p>
        ) : null}

        {state === 'loading' ? (
          <div className="mt-6 space-y-4" aria-busy="true" role="status">
            <span className="sr-only">جارٍ تحميل الطابور…</span>
            <Skeleton lines={['100%']} />
            <Skeleton lines={['100%']} />
          </div>
        ) : null}

        {state === 'error' && errorKind === 'auth' ? (
          <div className="mt-6">
            <EmptyState
              icon={<ShieldAlert className="h-12 w-12" aria-hidden="true" />}
              title="سجّل الدخول أولاً"
              description="لوحة المراجعة مرتبطة بحساب محامٍ — سجّل الدخول للوصول إلى الطابور."
              actionLabel="تسجيل الدخول"
              actionHref="/login"
            />
          </div>
        ) : null}

        {state === 'error' && errorKind === 'forbidden' ? (
          <div className="mt-6">
            <EmptyState
              icon={<ShieldAlert className="h-12 w-12" aria-hidden="true" />}
              title="هذه اللوحة مخصصة للمحامين"
              description="يتطلب طابور المراجعة صلاحيات lawyer أو admin — إن كنت محامياً فتأكد من حسابك."
              actionLabel="إعادة المحاولة"
              onAction={() => void load()}
            />
          </div>
        ) : null}

        {state === 'error' && errorKind === 'network' ? (
          <div className="mt-6">
            <EmptyState
              icon={<ClipboardCheck className="h-12 w-12" aria-hidden="true" />}
              title="تعذّر تحميل طابور المراجعة"
              description="تأكد من تشغيل الخادم ثم أعد المحاولة — أو شاهد معاينة تجريبية للشكل النهائي."
              actionLabel="إعادة المحاولة"
              onAction={() => void load()}
            />
            <div className="mt-3 flex justify-center">
              <Button variant="ghost" size="sm" onClick={loadDemo}>
                عرض معاينة تجريبية
              </Button>
            </div>
          </div>
        ) : null}

        {state === 'ready' && items.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={<Inbox className="h-12 w-12" aria-hidden="true" />}
              title="لا عناصر في الطابور اليوم — عمل رائع 🎉"
              actionLabel="تحديث"
              onAction={() => void load()}
            />
          </div>
        ) : null}

        {state === 'ready' && items.length > 0 && activeItem ? (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
            {/* قائمة العناصر */}
            {/* إتاحة (جولة 25): `role="region"` بدل `<aside>` — القائمة داخل
                `<main>` فكانت ستخالف landmark-complementary-is-top-level في أي
                فحص axe قادم لـ /review (نفس فئة إصلاح DisclaimerBanner). */}
            <div role="region" aria-label="قائمة عناصر المراجعة" className="space-y-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveId(item.id)}
                  aria-current={item.id === activeItem.id ? 'true' : undefined}
                  className={`w-full rounded-lg border p-4 text-start transition-colors duration-[120ms] focus-visible:outline-none ${
                    item.id === activeItem.id
                      ? 'border-primary-border bg-primary-soft'
                      : 'border-border-default bg-surface hover:bg-surface-muted'
                  }`}
                >
                  <span
                    className={`inline-flex h-6 items-center rounded-full border px-2 text-caption font-semibold ${PRIORITY_CLASSES[item.priority]}`}
                  >
                    #{item.id.slice(0, 8)} — {PRIORITY_LABELS[item.priority]}
                  </span>
                  <p className="mt-2 line-clamp-2 text-body-sm text-text-primary">{item.question}</p>
                  <p className="mt-1 text-caption text-text-tertiary">
                    المجال: {item.domain ? domainChipTokens[item.domain].label : 'غير محدد'}
                  </p>
                </button>
              ))}

              <div className="rounded-lg border border-border-default bg-surface-muted p-4 text-caption text-text-tertiary">
                اختصارات لوحة المفاتيح: <kbd>1</kbd> اعتماد · <kbd>2</kbd> رفض · <kbd>3</kbd> تعديل
              </div>
            </div>

            {/* منطقة المراجعة */}
            <section aria-label="منطقة المراجعة" className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-7 items-center rounded-full border px-3 text-body-sm font-semibold text-text-primary">
                  أولوية: {PRIORITY_LABELS[activeItem.priority]}
                </span>
                {activeItem.domain ? <DomainChip domain={activeItem.domain} /> : null}
              </div>

              <div className="rounded-lg border border-border-default bg-surface p-5">
                <h2 className="text-h4 font-semibold text-text-primary">سؤال المستخدم</h2>
                <p className="mt-2 text-body text-text-primary">{activeItem.question}</p>
              </div>

              <div className="rounded-lg border border-border-default bg-surface p-5">
                <h2 className="text-h4 font-semibold text-text-primary">الإجابة المولّدة</h2>
                <p className="mt-2 text-body-lg text-text-primary">{activeItem.generated_answer}</p>
              </div>

              <div className="rounded-lg border border-border-default bg-surface p-5">
                <h2 className="text-h4 font-semibold text-text-primary">المصدر المزعوم</h2>
                {activeItem.source ? (
                  <div className="mt-3">
                    <CitationCard citation={activeItem.source} defaultExpanded />
                  </div>
                ) : (
                  <p className="mt-2 text-body-sm text-text-secondary">
                    لم يُرفَق مصدر مزعوم لهذه الإجابة — يُفضَّل الرفض أو اقتراح تعديل.
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-border-default bg-surface p-5">
                <TextArea
                  label="ملاحظة (اختياري)"
                  ref={noteRef}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={2}
                  placeholder="اكتب ملاحظتك للمراجعة…"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void performAction('approve')} loading={processing}>
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  اعتماد (1)
                </Button>
                <Button variant="danger" onClick={() => void performAction('reject')} loading={processing}>
                  <XCircle className="h-4 w-4" aria-hidden="true" />
                  رفض (2)
                </Button>
                <Button variant="secondary" onClick={() => void performAction('suggest_edit')} loading={processing}>
                  <PencilLine className="h-4 w-4" aria-hidden="true" />
                  اقترح تعديلاً (3)
                </Button>
              </div>
            </section>
          </div>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}
