'use client';

/**
 * مكوّن GuidanceDetailScreen — تفاصيل مستند إرشادى واحد (/guidance/[id]).
 *
 * ⚠️ شفافية إلزامية (قاعدة الشفافية الكاملة): إن وُجدت quality_note من backend
 * (مثال: نص مُستخرج من PDF فيه تشوهات OCR طفيفة) تُعرض دائماً وبوضوح — لا تُخفى
 * أبداً حتى لا يُظن المحتوى نصاً رسمياً نظيفاً 100٪ دون تنبيه.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ChevronLeft, ExternalLink, FileX2, Loader2, WifiOff } from 'lucide-react';
import type { GuidanceDetail } from '@/lib/types';
import { fetchGuidanceDetail, ApiError } from '@/lib/api-client';
import { isDomainKey } from '@/lib/normalize';
import { DomainChip } from '@/components/ui/DomainChip';
import { EmptyState } from '@/components/ui/EmptyState';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
}

export interface GuidanceDetailScreenProps {
  id: string;
}

export function GuidanceDetailScreen({ id }: GuidanceDetailScreenProps) {
  const [item, setItem] = useState<GuidanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setNotFound(false);
      try {
        const data = await fetchGuidanceDetail(id);
        if (!cancelled) setItem(data);
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 404) setNotFound(true);
          else setError('تعذّر الاتصال بخدمة الأدلة الإرشادية — تأكد من تشغيل الخادم وحاول مرة أخرى.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (notFound) {
    return (
      <EmptyState
        icon={<FileX2 className="h-12 w-12" aria-hidden="true" />}
        title="الدليل الإرشادى غير موجود"
        description="قد يكون الرابط غير صحيح أو تم حذف هذا المستند."
        actionLabel="العودة لقائمة الأدلة الإرشادية"
        actionHref="/guidance"
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
        <span>جارٍ تحميل الدليل الإرشادى…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/guidance"
        className="inline-flex min-h-[44px] items-center gap-1 text-body-sm font-medium text-link hover:text-primary-hover focus-visible:outline-none"
      >
        <ChevronLeft className="h-4 w-4 rotate-180" aria-hidden="true" />
        الأدلة الإرشادية
      </Link>

      <section className="card-elevate rounded-xl border border-border-default bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {isDomainKey(item.category) ? <DomainChip domain={item.category} /> : null}
        </div>
        <h1 className="mt-3 text-h2 font-bold leading-snug text-text-primary">{item.title}</h1>

        <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-border-default pt-4 text-body-sm sm:grid-cols-3">
          {item.issuing_authority ? (
            <div>
              <dt className="text-text-tertiary">الجهة المُصدرة</dt>
              <dd className="mt-0.5 font-medium text-text-primary">{item.issuing_authority}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-text-tertiary">تاريخ الإصدار</dt>
            <dd className="mt-0.5 font-medium text-text-primary">{formatDate(item.issued_at)}</dd>
          </div>
          {item.related_law ? (
            <div>
              <dt className="text-text-tertiary">مرتبط بالقانون</dt>
              <dd className="mt-0.5">
                <Link
                  href={`/laws/${item.related_law.id}`}
                  className="font-medium text-link underline decoration-link underline-offset-4 hover:text-primary-hover"
                >
                  {item.related_law.title} ({item.related_law.law_no}/{item.related_law.law_year})
                </Link>
              </dd>
            </div>
          ) : null}
        </dl>

        {item.official_url ? (
          <a
            href={item.official_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-[44px] items-center gap-1 text-body-sm font-medium text-link underline decoration-link underline-offset-4 hover:text-primary-hover focus-visible:outline-none"
          >
            فتح المستند الرسمي (PDF)
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        ) : null}
      </section>

      {item.quality_note ? (
        <div role="note" className="flex items-start gap-3 rounded-lg border border-warning bg-warning-soft p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
          <div>
            <p className="text-body-sm font-semibold text-text-primary">ملاحظة على جودة النص</p>
            <p className="mt-1 text-body-sm text-text-secondary">{item.quality_note}</p>
          </div>
        </div>
      ) : null}

      {item.plain_summary ? (
        <section className="card-elevate rounded-lg border border-border-default bg-surface p-5">
          <h2 className="text-h4 font-semibold text-text-primary">ملخّص مبسّط</h2>
          <p className="mt-2 text-body text-text-secondary">{item.plain_summary}</p>
        </section>
      ) : null}

      <section aria-labelledby="guidance-body-title">
        <h2 id="guidance-body-title" className="text-h3 font-bold text-text-primary">
          النص الكامل
        </h2>
        <div className="legal-text mt-3 whitespace-pre-wrap rounded-md border border-border-default bg-surface-inset p-5 text-text-primary">
          {item.body}
        </div>
      </section>
    </div>
  );
}
