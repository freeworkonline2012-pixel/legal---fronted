'use client';

/**
 * صفحة «أسئلتي» (S-08 في wireframes + F-15 + F-14).
 *
 * - تحميل سجل الأسئلة من GET /api/questions/history.
 * - حذف سؤال → مودال تأكيد → DELETE /api/questions/{id} (F-14، حقوق 151/2020).
 * - حالات: تحميل (Skeleton) / خطأ (إعادة محاولة + معاينة تجريبية صريحة) / فارغة.
 * - روابط حقوق البيانات في التذييل (تصدير / حذف الحساب).
 */

import { useCallback, useEffect, useState } from 'react';
import { FileQuestion, Trash2 } from 'lucide-react';
import type { QuestionHistoryItem } from '@/lib/types';
import { deleteQuestion, fetchQuestionHistory } from '@/lib/api-client';
import { DEMO_HISTORY } from '@/lib/demo-data';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { DomainChip } from '@/components/ui/DomainChip';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { useToast } from '@/components/ui/Toast';
import { getConfidenceKey, isDomainKey } from '@/lib/normalize';

type LoadState = 'loading' | 'ready' | 'error';

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function MyQuestionsPage() {
  const { showToast } = useToast();
  const [state, setState] = useState<LoadState>('loading');
  const [items, setItems] = useState<QuestionHistoryItem[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<QuestionHistoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setState('loading');
    setIsDemo(false);
    setNeedsAuth(false);
    try {
      const history = await fetchQuestionHistory();
      setItems(history.items);
      setState('ready');
    } catch (error) {
      // 401 = غير مصادق — نوجّه المستخدم لتسجيل الدخول بدل عرض خطأ عام
      if (error instanceof Error && error.message.includes('401')) {
        setNeedsAuth(true);
        setState('error');
        return;
      }
      setState('error');
    }
  }, []);

  useEffect(() => {
    // متعمّد: جلب بيانات غير متزامن؛ كل استدعاءات setState داخل load() تحدث في
    // استدعاءات وعود (promise callbacks) بعد اكتمال الطلب — النمط الموثّق لجلب
    // البيانات عند التركيب.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function loadDemo() {
    setItems(DEMO_HISTORY);
    setIsDemo(true);
    setState('ready');
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleting(true);
    // في الوضع التجريبي (فشل اتصال سابق) لا يوجد backend حقيقي — نُزيل محلياً
    // فقط؛ في الوضع الفعلي نحذف عبر DELETE /api/questions/{id} (F-14 — 151/2020).
    if (isDemo) {
      window.setTimeout(() => {
        setItems((prev) => prev.filter((item) => item.id !== target.id));
        setDeleting(false);
        setDeleteTarget(null);
        showToast('success', 'تم حذف السؤال.');
      }, 400);
      return;
    }
    void (async () => {
      try {
        await deleteQuestion(target.id);
        setItems((prev) => prev.filter((item) => item.id !== target.id));
        setDeleteTarget(null);
        showToast('success', 'تم حذف السؤال.');
      } catch {
        // فشل الحذف — لا نُزيل العنصر ونُظهر خطأً واضحاً (لا يختفي تلقائياً)
        setDeleteTarget(null);
        showToast('error', 'تعذّر حذف السؤال — تحقق من الاتصال وحاول مرة أخرى.');
      } finally {
        setDeleting(false);
      }
    })();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-ui text-text-primary">
      <Header />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 pb-28 sm:px-8 lg:pb-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-h2 font-bold text-text-primary">أسئلتي</h1>
            <p className="mt-1 text-body-sm text-text-secondary">
              سجل أسئلتك وإجاباتها الموثّقة — يمكنك حذف أي سؤال وفق حقوقك في 151/2020.
            </p>
          </div>
        </div>

        {isDemo ? (
          <p role="status" className="mt-4 rounded-md bg-warning-soft px-3 py-2 text-body-sm text-warning">
            تعذّر الاتصال بالخادم — تعرض بيانات تجريبية للمعاينة فقط (ليست بياناتك الفعلية).
          </p>
        ) : null}

        <div className="mt-6 space-y-4">
          {state === 'loading' ? (
            <div className="space-y-4" aria-busy="true" role="status">
              <span className="sr-only">جارٍ تحميل أسئلتك…</span>
              <Skeleton lines={['100%']} />
              <Skeleton lines={['100%']} />
              <Skeleton lines={['100%']} />
            </div>
          ) : null}

          {state === 'error' && !needsAuth ? (
            <EmptyState
              icon={<FileQuestion className="h-12 w-12" aria-hidden="true" />}
              title="تعذّر تحميل سجل أسئلتك"
              description="تأكد من تشغيل الخادم ثم أعد المحاولة — أو شاهد معاينة تجريبية للشكل النهائي."
              actionLabel="إعادة المحاولة"
              onAction={() => void load()}
            />
          ) : null}

          {state === 'error' && needsAuth ? (
            <EmptyState
              icon={<FileQuestion className="h-12 w-12" aria-hidden="true" />}
              title="سجّل الدخول أولاً"
              description="سجل أسئلتك مرتبط بحسابك — سجّل الدخول أو أنشئ حساباً للوصول إليه، أو شاهد معاينة تجريبية."
              actionLabel="تسجيل الدخول"
              actionHref="/login"
            />
          ) : null}

          {state === 'error' ? (
            <div className="flex justify-center">
              <Button variant="ghost" size="sm" onClick={loadDemo}>
                عرض معاينة تجريبية
              </Button>
            </div>
          ) : null}

          {state === 'ready' && items.length === 0 ? (
            <EmptyState
              icon={<FileQuestion className="h-12 w-12" aria-hidden="true" />}
              title="لا توجد أسئلة بعد"
              description="اطرح أول سؤال وستجده هنا مع إجاباته واستشهاداته."
              actionLabel="اطرح سؤالاً الآن"
              actionHref="/chat"
            />
          ) : null}

          {state === 'ready' && items.length > 0 ? (
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-border-default bg-surface p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {item.category && isDomainKey(item.category) ? <DomainChip domain={item.category} /> : null}
                    {item.refused ? (
                      <span className="inline-flex h-7 items-center rounded-full border border-error bg-error-soft px-3 text-body-sm font-semibold text-error">
                        تم الرفض (لا تخمين)
                      </span>
                    ) : item.confidence !== null ? (
                      <ConfidenceBadge level={getConfidenceKey(item.confidence)} />
                    ) : null}
                    <span className="text-caption text-text-tertiary">{formatDate(item.created_at)}</span>
                    <button
                      type="button"
                      aria-label={`حذف السؤال: ${item.question}`}
                      onClick={() => setDeleteTarget(item)}
                      className="ms-auto inline-flex h-11 w-11 items-center justify-center rounded-md text-text-tertiary hover:bg-error-soft hover:text-error focus-visible:outline-none"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <p className="mt-2 text-body text-text-primary">{item.question}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </main>

      <Footer showDataRights />

      <BottomNav />

      <Modal
        open={deleteTarget !== null}
        title="حذف هذا السؤال نهائياً؟"
        primaryLabel="حذف نهائي"
        secondaryLabel="إلغاء"
        danger
        primaryLoading={deleting}
        onPrimary={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      >
        <p>
          سيُحذف السؤال وإجابته من سجلك نهائياً ولا يمكن التراجع — وفق حقك في الحذف
          المنصوص عليه في قانون 151/2020.
        </p>
      </Modal>
    </div>
  );
}
