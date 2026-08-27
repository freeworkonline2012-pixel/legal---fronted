'use client';

/**
 * مكوّن ArticleDetailScreen — تفاصيل مادة واحدة مع نسختها السارية (/laws/[id]/articles/[no]).
 * يعيد استخدام CitationCard نفسه (نفس البطاقة المستخدمة فى إجابات المساعد) لضمان
 * اتساق العرض بين «الاستشهاد داخل إجابة» و«تصفح المادة مباشرة».
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, FileX2, Loader2, WifiOff } from 'lucide-react';
import type { ArticleDetail, LawItem } from '@/lib/types';
import { fetchArticleDetail, fetchLaw, ApiError } from '@/lib/api-client';
import { CitationCard } from '@/components/ui/CitationCard';
import { EmptyState } from '@/components/ui/EmptyState';

export interface ArticleDetailScreenProps {
  lawId: string;
  articleNo: number;
}

export function ArticleDetailScreen({ lawId, articleNo }: ArticleDetailScreenProps) {
  const [law, setLaw] = useState<LawItem | null>(null);
  const [article, setArticle] = useState<ArticleDetail | null>(null);
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
        const [lawData, articleData] = await Promise.all([
          fetchLaw(lawId),
          fetchArticleDetail(lawId, articleNo),
        ]);
        if (!cancelled) {
          setLaw(lawData);
          setArticle(articleData);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 404) setNotFound(true);
          else setError('تعذّر الاتصال بخدمة القوانين — تأكد من تشغيل الخادم وحاول مرة أخرى.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [lawId, articleNo]);

  if (notFound) {
    return (
      <EmptyState
        icon={<FileX2 className="h-12 w-12" aria-hidden="true" />}
        title="المادة غير موجودة"
        description="قد يكون رقم المادة غير صحيح أو غير موجود فى هذا القانون."
        actionLabel="العودة لتفاصيل القانون"
        actionHref={`/laws/${lawId}`}
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

  if (loading || !law || !article) {
    return (
      <div role="status" aria-busy="true" className="flex items-center justify-center gap-2 py-16 text-text-secondary">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        <span>جارٍ تحميل المادة…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/laws/${law.id}`}
        className="inline-flex min-h-[44px] items-center gap-1 text-body-sm font-medium text-link hover:text-primary-hover focus-visible:outline-none"
      >
        <ChevronLeft className="h-4 w-4 rotate-180" aria-hidden="true" />
        {law.short_title ?? law.title}
      </Link>

      <CitationCard
        defaultExpanded
        citation={{
          law: law.short_title ?? law.title,
          law_no: law.law_no,
          law_year: law.law_year,
          article_no: article.article_no,
          status: article.version.status,
          last_amended: article.version.effective_from,
          official_url: law.official_url,
          snippet: article.version.body,
        }}
      />

      {article.plain_summary ? (
        <section className="card-elevate rounded-lg border border-border-default bg-surface p-5">
          <h2 className="text-h4 font-semibold text-text-primary">ملخّص مبسّط</h2>
          <p className="mt-2 text-body text-text-secondary">{article.plain_summary}</p>
        </section>
      ) : null}

      {article.version.change_note ? (
        <p className="text-body-sm text-text-tertiary">ملاحظة التعديل: {article.version.change_note}</p>
      ) : null}
    </div>
  );
}
