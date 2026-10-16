'use client';

/**
 * مكوّن ReferenceDetailScreen — قراءة مرجع قانونى واحد (/references/[id]).
 *
 * يعرض البيانات الوصفية وفهرس الأقسام، ويقرأ قسماً واحداً كل مرة (الكتاب قد
 * يبلغ مئات الصفحات فلا يُحمَّل متنه كاملاً). القسم الحالى يُحفظ فى الرابط
 * (؟s=) فيُشارَك الموضع ويعمل رابط نتيجة البحث مباشرة.
 *
 * ⚠️ شفافية: source_note وrights_note تُعرضان دائماً إن وُجدتا — المرجع رأى
 * مؤلفه وليس نصاً تشريعياً رسمياً، ولا يُستخدم فى توليد الإجابات.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, FileX2, Info, Loader2, WifiOff } from 'lucide-react';
import type { LegalReferenceDetail, LegalReferenceSection } from '@/lib/types';
import { ApiError, fetchLegalReferenceDetail, fetchLegalReferenceSection } from '@/lib/api-client';
import { isDomainKey } from '@/lib/normalize';
import { pageRangeLabel, referenceTypeLabel } from '@/lib/legal-reference';
import { DomainChip } from '@/components/ui/DomainChip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

export interface ReferenceDetailScreenProps {
  id: string;
  /** رقم القسم المبدئى من الرابط (؟s=) */
  initialSeq?: number;
}

export function ReferenceDetailScreen({ id, initialSeq }: ReferenceDetailScreenProps) {
  const [item, setItem] = useState<LegalReferenceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [seq, setSeq] = useState<number | null>(initialSeq ?? null);
  const [section, setSection] = useState<LegalReferenceSection | null>(null);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [sectionRetry, setSectionRetry] = useState(0);
  const readerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setNotFound(false);
      try {
        const data = await fetchLegalReferenceDetail(id);
        if (cancelled) return;
        setItem(data);
        // قسم مبدئى غير موجود فى الفهرس (رابط قديم) → أول قسم بدل صفحة خطأ.
        setSeq((current) =>
          current !== null && data.toc.some((t) => t.seq === current) ? current : (data.toc[0]?.seq ?? null),
        );
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError('تعذّر الاتصال بخدمة المراجع القانونية — تأكد من تشغيل الخادم وحاول مرة أخرى.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // لا يُطلب أى قسم قبل وصول الفهرس: رقم القسم المبدئى (من الرابط) قد لا يكون
  // موجوداً، ويُصحَّح مع تحميل الفهرس فى نفس التحديث.
  const tocLoaded = item !== null;
  useEffect(() => {
    if (seq === null || !tocLoaded) return;
    const currentSeq = seq;
    let cancelled = false;
    async function loadSection() {
      setSectionLoading(true);
      setSectionError(null);
      try {
        const data = await fetchLegalReferenceSection(id, currentSeq);
        if (!cancelled) setSection(data);
      } catch {
        if (!cancelled) setSectionError('تعذّر تحميل هذا القسم — حاول مرة أخرى.');
      } finally {
        if (!cancelled) setSectionLoading(false);
      }
    }
    void loadSection();
    return () => {
      cancelled = true;
    };
  }, [id, seq, tocLoaded, sectionRetry]);

  const goTo = useCallback(
    (next: number) => {
      setSeq(next);
      try {
        window.history.replaceState(null, '', `/references/${id}?s=${next}`);
      } catch {
        /* تحديث الرابط تحسين فقط */
      }
      readerRef.current?.scrollIntoView?.({ block: 'start' });
    },
    [id],
  );

  if (notFound) {
    return (
      <EmptyState
        icon={<FileX2 className="h-12 w-12" aria-hidden="true" />}
        title="المرجع غير موجود"
        description="قد يكون الرابط غير صحيح أو تم حذف هذا المرجع."
        actionLabel="العودة إلى المراجع القانونية"
        actionHref="/references"
      />
    );
  }

  if (error) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-error-soft bg-error-soft px-6 py-10 text-center">
        <WifiOff className="h-8 w-8 text-error" aria-hidden="true" />
        <p className="text-body text-error">{error}</p>
      </div>
    );
  }

  if (loading || !item) {
    return (
      <div role="status" aria-busy="true" className="flex items-center justify-center gap-2 py-16 text-text-secondary">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        <span>جارٍ تحميل المرجع…</span>
      </div>
    );
  }

  const meta: Array<[string, string]> = [];
  if (item.author) meta.push(['المؤلف', item.author]);
  if (item.publisher) meta.push(['الناشر', item.publisher]);
  if (item.edition) meta.push(['الطبعة', item.edition]);
  if (item.published_year) meta.push(['سنة النشر', String(item.published_year)]);

  return (
    <div className="space-y-6">
      <Link
        href={`/references?country=${item.country_code}`}
        className="inline-flex min-h-[44px] items-center gap-1 text-body-sm font-medium text-link hover:text-primary-hover focus-visible:outline-none"
      >
        <ChevronLeft className="h-4 w-4 rotate-180" aria-hidden="true" />
        المراجع القانونية
      </Link>

      <section className="card-elevate rounded-xl border border-border-default bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-caption font-medium text-primary">
            {referenceTypeLabel(item.reference_type)}
          </span>
          {isDomainKey(item.category) ? <DomainChip domain={item.category} /> : null}
        </div>
        <h1 className="mt-3 text-h2 font-bold leading-snug text-text-primary">{item.title}</h1>
        {meta.length > 0 ? (
          <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-border-default pt-4 text-body-sm sm:grid-cols-2">
            {meta.map(([label, value]) => (
              <div key={label}>
                <dt className="text-text-tertiary">{label}</dt>
                <dd className="mt-0.5 font-medium text-text-primary">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {item.summary ? <p className="mt-4 text-body text-text-secondary">{item.summary}</p> : null}
      </section>

      <div role="note" className="flex items-start gap-3 rounded-lg border border-border-default bg-surface-muted p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-text-tertiary" aria-hidden="true" />
        <div className="space-y-1 text-body-sm text-text-secondary">
          <p>
            هذا مرجع للاطلاع والبحث فقط، ويعبّر عن رأى مؤلفه — وليس نصاً تشريعياً رسمياً، ولا تعتمد عليه
            إجابات المنصة.
          </p>
          {item.source_note ? <p>المصدر: {item.source_note}</p> : null}
          {item.rights_note ? <p>الحقوق: {item.rights_note}</p> : null}
        </div>
      </div>

      {item.toc.length === 0 ? (
        <EmptyState
          icon={<FileX2 className="h-12 w-12" aria-hidden="true" />}
          title="لا يوجد متن لهذا المرجع بعد"
          description="لم تُرفع أقسام هذا المرجع إلى المكتبة."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          <nav aria-label="فهرس المرجع" className="lg:sticky lg:top-4 lg:self-start">
            <h2 className="text-h4 font-semibold text-text-primary">الفهرس ({item.toc.length})</h2>
            <ol className="mt-2 max-h-72 space-y-0.5 overflow-y-auto rounded-md border border-border-default bg-surface p-1">
              {item.toc.map((entry) => {
                const pages = pageRangeLabel(entry.page_from, entry.page_to);
                const active = entry.seq === seq;
                return (
                  <li key={entry.seq}>
                    <button
                      type="button"
                      aria-current={active ? 'true' : undefined}
                      onClick={() => goTo(entry.seq)}
                      className={`flex min-h-[36px] w-full items-baseline justify-between gap-2 rounded px-2 py-1 text-start text-body-sm focus-visible:outline-none ${
                        active
                          ? 'bg-primary-soft font-semibold text-primary'
                          : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary'
                      }`}
                    >
                      <span className="flex-1">{entry.heading || `القسم ${entry.seq}`}</span>
                      {pages ? <span className="shrink-0 text-[11px] text-text-tertiary">{pages}</span> : null}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <section ref={readerRef} aria-labelledby="reference-section-title" aria-live="polite">
            {sectionError ? (
              <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-error-soft bg-error-soft px-6 py-10 text-center">
                <p className="text-body text-error">{sectionError}</p>
                <Button variant="secondary" size="sm" onClick={() => setSectionRetry((k) => k + 1)}>
                  إعادة المحاولة
                </Button>
              </div>
            ) : sectionLoading || !section ? (
              <div role="status" aria-busy="true" className="flex items-center justify-center gap-2 py-16 text-text-secondary">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                <span>جارٍ تحميل القسم…</span>
              </div>
            ) : (
              <>
                <h2 id="reference-section-title" className="text-h3 font-bold text-text-primary">
                  {section.heading || `القسم ${section.seq}`}
                </h2>
                {pageRangeLabel(section.page_from, section.page_to) ? (
                  <p className="mt-1 text-caption text-text-tertiary">
                    {pageRangeLabel(section.page_from, section.page_to)}
                  </p>
                ) : null}
                <div className="legal-text mt-3 whitespace-pre-wrap rounded-md border border-border-default bg-surface-inset p-5 text-text-primary">
                  {section.body}
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={section.prev_seq === null}
                    onClick={() => section.prev_seq !== null && goTo(section.prev_seq)}
                  >
                    القسم السابق
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={section.next_seq === null}
                    onClick={() => section.next_seq !== null && goTo(section.next_seq)}
                  >
                    القسم التالى
                  </Button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
