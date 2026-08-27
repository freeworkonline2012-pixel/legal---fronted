'use client';

/**
 * مكوّن LawDetailScreen — تفاصيل قانون واحد + قائمة مواده (/laws/[id]).
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ExternalLink, FileText, Loader2, WifiOff } from 'lucide-react';
import type { ArticleItem, LawItem } from '@/lib/types';
import { fetchArticles, fetchLaw, ApiError } from '@/lib/api-client';
import { isDomainKey } from '@/lib/normalize';
import { DomainChip } from '@/components/ui/DomainChip';
import { LawStatusBadge } from '@/components/ui/LawStatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

const ARTICLES_PAGE_SIZE = 30;

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
}

export interface LawDetailScreenProps {
  lawId: string;
}

export function LawDetailScreen({ lawId }: LawDetailScreenProps) {
  const [law, setLaw] = useState<LawItem | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadingLaw, setLoadingLaw] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [articlesTotal, setArticlesTotal] = useState(0);
  const [loadingArticles, setLoadingArticles] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingLaw(true);
      setError(null);
      setNotFound(false);
      try {
        const data = await fetchLaw(lawId);
        if (!cancelled) setLaw(data);
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 404) setNotFound(true);
          else setError('تعذّر الاتصال بخدمة القوانين — تأكد من تشغيل الخادم وحاول مرة أخرى.');
        }
      } finally {
        if (!cancelled) setLoadingLaw(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [lawId]);

  useEffect(() => {
    let cancelled = false;
    async function loadArticles() {
      setLoadingArticles(true);
      try {
        const page = await fetchArticles(lawId, { limit: ARTICLES_PAGE_SIZE, offset: 0 });
        if (!cancelled) {
          setArticles(page.items);
          setArticlesTotal(page.total);
        }
      } catch {
        // فشل تحميل المواد لا يمنع عرض بيانات القانون نفسه — يُعرض قسم فارغ بدل تعطيل الصفحة كاملة
      } finally {
        if (!cancelled) setLoadingArticles(false);
      }
    }
    void loadArticles();
    return () => {
      cancelled = true;
    };
  }, [lawId]);

  async function loadMoreArticles() {
    setLoadingArticles(true);
    try {
      const page = await fetchArticles(lawId, { limit: ARTICLES_PAGE_SIZE, offset: articles.length });
      setArticles((prev) => [...prev, ...page.items]);
    } catch {
      // تجاهل — الزر يبقى متاحاً لإعادة المحاولة
    } finally {
      setLoadingArticles(false);
    }
  }

  if (notFound) {
    return (
      <EmptyState
        icon={<FileText className="h-12 w-12" aria-hidden="true" />}
        title="القانون غير موجود"
        description="قد يكون الرابط غير صحيح أو تم حذف هذا القانون."
        actionLabel="العودة لقائمة القوانين"
        actionHref="/laws"
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

  if (loadingLaw || !law) {
    return (
      <div role="status" aria-busy="true" className="flex items-center justify-center gap-2 py-16 text-text-secondary">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        <span>جارٍ تحميل بيانات القانون…</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Link
        href="/laws"
        className="inline-flex min-h-[44px] items-center gap-1 text-body-sm font-medium text-link hover:text-primary-hover focus-visible:outline-none"
      >
        <ChevronLeft className="h-4 w-4 rotate-180" aria-hidden="true" />
        القوانين والقرارات
      </Link>

      <section className="card-elevate rounded-xl border border-border-default bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {isDomainKey(law.category) ? <DomainChip domain={law.category} /> : null}
          <LawStatusBadge status={law.status} size="md" />
        </div>
        <h1 className="mt-3 text-h2 font-bold leading-snug text-text-primary">{law.title}</h1>
        {law.short_title && law.short_title !== law.title ? (
          <p className="mt-1 text-body-lg text-text-secondary">{law.short_title}</p>
        ) : null}

        <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-border-default pt-4 text-body-sm sm:grid-cols-3">
          <div>
            <dt className="text-text-tertiary">الرقم والسنة</dt>
            <dd className="mt-0.5 font-medium text-text-primary" dir="ltr">
              {law.law_no}/{law.law_year}
            </dd>
          </div>
          <div>
            <dt className="text-text-tertiary">تاريخ الإصدار</dt>
            <dd className="mt-0.5 font-medium text-text-primary">{formatDate(law.enacted_at)}</dd>
          </div>
          <div>
            <dt className="text-text-tertiary">آخر تعديل</dt>
            <dd className="mt-0.5 font-medium text-text-primary">{formatDate(law.last_amended_at)}</dd>
          </div>
        </dl>

        {law.official_url ? (
          <a
            href={law.official_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-[44px] items-center gap-1 text-body-sm font-medium text-link underline decoration-link underline-offset-4 hover:text-primary-hover focus-visible:outline-none"
          >
            فتح النص الرسمي الكامل
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        ) : null}
      </section>

      <section aria-labelledby="articles-title">
        <div className="flex items-baseline justify-between">
          <h2 id="articles-title" className="text-h3 font-bold text-text-primary">
            المواد
          </h2>
          {articlesTotal > 0 ? (
            <p className="text-body-sm text-text-tertiary">
              {articles.length} من {articlesTotal}
            </p>
          ) : null}
        </div>

        {loadingArticles && articles.length === 0 ? (
          <div role="status" aria-busy="true" className="mt-4 flex items-center justify-center gap-2 py-10 text-text-secondary">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span>جارٍ تحميل المواد…</span>
          </div>
        ) : articles.length === 0 ? (
          <p className="mt-4 text-body-sm text-text-tertiary">لا توجد مواد مُقسّمة لهذا المستند بعد.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {articles.map((article) => (
              <li key={article.id}>
                <Link
                  href={`/laws/${law.id}/articles/${article.article_no}`}
                  className="card-elevate flex flex-col gap-1 rounded-lg border border-border-default bg-surface p-4 hover:border-primary-border hover:shadow-md focus-visible:outline-none"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-body font-semibold text-text-primary">مادة {article.article_no}</span>
                    {article.title ? <span className="text-body-sm text-text-secondary">— {article.title}</span> : null}
                  </div>
                  {article.hierarchical_location ? (
                    <p className="text-caption text-text-tertiary">{article.hierarchical_location}</p>
                  ) : null}
                  <p className="line-clamp-2 text-body-sm text-text-secondary">{article.body}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {articles.length < articlesTotal ? (
          <div className="mt-4 flex justify-center">
            <Button variant="secondary" onClick={() => void loadMoreArticles()} loading={loadingArticles}>
              تحميل المزيد
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
