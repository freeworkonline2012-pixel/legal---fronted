'use client';

/**
 * مكوّن ReferencesBrowser — تصفح وبحث المراجع القانونية (/references).
 *
 * وضعان: (1) "العناوين والمؤلفين": قائمة الكتب مفلترة من الخادم؛ (2) "داخل
 * النصوص": بحث نصى كامل داخل أقسام المراجع مع مقتطف وموضع (قسم/صفحات).
 * الترشيح والترقيم كلاهما من الخادم (المراجع قد تكون مئات الكتب بآلاف الأقسام،
 * فلا جلب كامل على العميل كما فى LawsBrowser).
 * المراجع للعرض والبحث فقط — لا تدخل محرك الإجابات.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BookMarked, Loader2, Search, WifiOff } from 'lucide-react';
import type {
  CountryItem,
  LegalReferenceListItem,
  LegalReferenceSearchHit,
  LegalReferenceType,
} from '@/lib/types';
import {
  ApiError,
  fetchCountries,
  fetchLegalReferences,
  searchLegalReferences,
} from '@/lib/api-client';
import {
  REFERENCE_TYPES,
  pageRangeLabel,
  referenceTypeLabel,
  splitSnippet,
} from '@/lib/legal-reference';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;
const MIN_FULLTEXT_LENGTH = 2;

type Mode = 'catalog' | 'fulltext';

export interface ReferencesBrowserProps {
  /** دولة مبدئية من رابط عميق (؟country=) — قادم عادةً من "القائمة الرئيسية" */
  initialCountry?: string;
}

export function ReferencesBrowser({ initialCountry }: ReferencesBrowserProps) {
  const [mode, setMode] = useState<Mode>('catalog');
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState<string>(initialCountry ?? 'all');
  const [type, setType] = useState<string>('all');
  const [countries, setCountries] = useState<CountryItem[]>([]);

  const [books, setBooks] = useState<LegalReferenceListItem[]>([]);
  const [hits, setHits] = useState<LegalReferenceSearchHit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // رقم الطلب الأحدث — يُهمل أى رد متأخر لطلب أقدم (سباق الكتابة السريعة).
  const requestSeq = useRef(0);

  // تأخير بسيط قبل إرسال نص البحث للخادم.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    let cancelled = false;
    fetchCountries().then(
      (res) => {
        if (!cancelled) setCountries(res.items);
      },
      () => {
        /* الفلتر اختيارى — فشله لا يمنع التصفح */
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const fulltextTooShort = mode === 'fulltext' && query.length < MIN_FULLTEXT_LENGTH;

  const loadPage = useCallback(
    async (offset: number): Promise<{ books: LegalReferenceListItem[]; hits: LegalReferenceSearchHit[]; total: number }> => {
      const common = {
        country: country === 'all' ? undefined : country,
        referenceType: type === 'all' ? undefined : (type as LegalReferenceType),
        limit: PAGE_SIZE,
        offset,
      };
      if (mode === 'fulltext') {
        const res = await searchLegalReferences({ ...common, q: query });
        return { books: [], hits: res.items, total: res.total };
      }
      const res = await fetchLegalReferences({ ...common, q: query || undefined });
      return { books: res.items, hits: [], total: res.total };
    },
    [mode, query, country, type],
  );

  useEffect(() => {
    // نص قصير فى البحث النصى: لا طلب، والواجهة تعرض التلميح (يُشتق من fulltextTooShort).
    // رفع requestSeq يُبطل أى رد متأخر لطلب سابق.
    if (fulltextTooShort) {
      requestSeq.current += 1;
      return;
    }
    const mine = ++requestSeq.current;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const page = await loadPage(0);
        if (mine !== requestSeq.current) return;
        setBooks(page.books);
        setHits(page.hits);
        setTotal(page.total);
      } catch (err: unknown) {
        if (mine !== requestSeq.current) return;
        setError(
          err instanceof ApiError
            ? 'تعذّر الاتصال بخدمة المراجع القانونية — تأكد من تشغيل الخادم وحاول مرة أخرى.'
            : 'حدث خطأ غير متوقع أثناء تحميل المراجع القانونية.',
        );
      } finally {
        if (mine === requestSeq.current) setLoading(false);
      }
    }
    void load();
  }, [loadPage, fulltextTooShort, reloadKey]);

  async function loadMore() {
    const mine = requestSeq.current;
    setLoadingMore(true);
    try {
      const offset = mode === 'fulltext' ? hits.length : books.length;
      const page = await loadPage(offset);
      if (mine !== requestSeq.current) return;
      setBooks((prev) => [...prev, ...page.books]);
      setHits((prev) => [...prev, ...page.hits]);
      setTotal(page.total);
    } catch {
      if (mine === requestSeq.current) setError('تعذّر تحميل المزيد — حاول مرة أخرى.');
    } finally {
      setLoadingMore(false);
    }
  }

  const shown = mode === 'fulltext' ? hits.length : books.length;
  const countryName = (code: string) => countries.find((c) => c.code === code)?.name_ar ?? code;

  const fieldClass =
    'h-11 rounded-md border border-border-default bg-surface px-3 text-body-sm text-text-primary focus:outline-none focus-visible:shadow-[0_0_0_3px_var(--color-focus-ring)]';

  return (
    <div className="space-y-6">
      <div className="card-elevate space-y-3 rounded-xl border border-border-default bg-surface p-4">
        <div role="tablist" aria-label="نطاق البحث" className="inline-flex rounded-md border border-border-default p-0.5">
          {(
            [
              ['catalog', 'العناوين والمؤلفون'],
              ['fulltext', 'داخل نصوص المراجع'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
              className={`min-h-[36px] rounded px-3 text-body-sm font-medium focus-visible:outline-none ${
                mode === value ? 'bg-primary text-text-on-primary' : 'text-text-secondary hover:bg-surface-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-text-tertiary"
              aria-hidden="true"
            />
            <label htmlFor="references-search" className="sr-only">
              {mode === 'fulltext' ? 'ابحث داخل نصوص المراجع' : 'ابحث بعنوان المرجع أو المؤلف'}
            </label>
            <input
              id="references-search"
              type="search"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={mode === 'fulltext' ? 'ابحث داخل نصوص المراجع…' : 'ابحث بعنوان المرجع أو المؤلف…'}
              className="h-11 w-full rounded-md border border-border-default bg-surface ps-9 pe-3 text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:shadow-[0_0_0_3px_var(--color-focus-ring)]"
            />
          </div>

          {countries.length > 0 ? (
            <>
              <label htmlFor="references-country" className="sr-only">
                الدولة
              </label>
              <select
                id="references-country"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                className={fieldClass}
              >
                <option value="all">كل الدول</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name_ar}
                  </option>
                ))}
              </select>
            </>
          ) : null}

          <label htmlFor="references-type" className="sr-only">
            نوع المرجع
          </label>
          <select
            id="references-type"
            value={type}
            onChange={(event) => setType(event.target.value)}
            className={fieldClass}
          >
            <option value="all">كل الأنواع</option>
            {REFERENCE_TYPES.map((value) => (
              <option key={value} value={value}>
                {referenceTypeLabel(value)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {fulltextTooShort ? (
        <p className="text-body-sm text-text-tertiary">اكتب حرفين على الأقل للبحث داخل نصوص المراجع.</p>
      ) : loading ? (
        <div role="status" aria-busy="true" className="flex items-center justify-center gap-2 py-16 text-text-secondary">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span>جارٍ التحميل…</span>
        </div>
      ) : error && shown === 0 ? (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-error-soft bg-error-soft px-6 py-10 text-center">
          <WifiOff className="h-8 w-8 text-error" aria-hidden="true" />
          <p className="text-body text-error">{error}</p>
          <Button variant="secondary" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
            إعادة المحاولة
          </Button>
        </div>
      ) : shown === 0 ? (
        <EmptyState
          icon={<BookMarked className="h-12 w-12" aria-hidden="true" />}
          title={query || type !== 'all' || country !== 'all' ? 'لا توجد مراجع مطابقة' : 'لا توجد مراجع بعد'}
          description={
            query || type !== 'all' || country !== 'all'
              ? 'جرّب تغيير كلمات البحث أو إزالة الفلاتر.'
              : 'ستظهر هنا الكتب والشروح الفقهية والقضائية فور رفعها إلى المكتبة.'
          }
        />
      ) : (
        <>
          <p className="text-body-sm text-text-tertiary">
            {mode === 'fulltext'
              ? `${total} نتيجة داخل نصوص المراجع`
              : `${total} مرجعاً`}
          </p>

          {mode === 'fulltext' ? (
            <ul className="space-y-3">
              {hits.map((hit) => {
                const pages = pageRangeLabel(hit.page_from, hit.page_to);
                return (
                  <li key={`${hit.reference_id}-${hit.seq}`}>
                    <Link
                      href={`/references/${hit.reference_id}?s=${hit.seq}`}
                      className="card-elevate block rounded-xl border border-border-default bg-surface p-5 shadow-sm hover:border-primary-border hover:shadow-md focus-visible:outline-none"
                    >
                      <p className="text-body-sm font-semibold text-text-primary">
                        {hit.reference_title}
                        {hit.author ? <span className="font-normal text-text-secondary"> — {hit.author}</span> : null}
                      </p>
                      <p className="mt-0.5 text-caption text-text-tertiary">
                        {[hit.heading, pages, countryName(hit.country_code)].filter(Boolean).join(' · ')}
                      </p>
                      <p className="mt-2 text-body-sm leading-relaxed text-text-secondary">
                        …
                        {splitSnippet(hit.snippet).map((part, i) =>
                          part.match ? (
                            <mark key={i} className="rounded bg-warning-soft px-0.5 text-text-primary">
                              {part.text}
                            </mark>
                          ) : (
                            <span key={i}>{part.text}</span>
                          ),
                        )}
                        …
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {books.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/references/${item.id}`}
                    className="card-elevate flex h-full flex-col gap-2 rounded-xl border border-border-default bg-surface p-5 shadow-sm hover:border-primary-border hover:shadow-md focus-visible:outline-none"
                  >
                    <span className="w-fit rounded-full bg-primary-soft px-2.5 py-0.5 text-caption font-medium text-primary">
                      {referenceTypeLabel(item.reference_type)}
                    </span>
                    <h3 className="text-h4 font-bold leading-snug text-text-primary">{item.title}</h3>
                    {item.author ? <p className="text-body-sm text-text-secondary">{item.author}</p> : null}
                    <p className="mt-auto text-caption text-text-tertiary">
                      {[
                        countryName(item.country_code),
                        item.published_year ? String(item.published_year) : null,
                        `${item.section_count} قسماً`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {error ? (
            <p role="alert" className="text-body-sm text-error">
              {error}
            </p>
          ) : null}

          {shown < total ? (
            <div className="flex justify-center">
              <Button variant="secondary" onClick={() => void loadMore()} loading={loadingMore}>
                عرض المزيد ({total - shown})
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
