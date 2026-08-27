'use client';

/**
 * مكوّن GuidanceBrowser — تصفح الأدلة والمنشورات الإرشادية غير المرقّمة (/guidance).
 * نفس منطق LawsBrowser (جلب كامل + فلترة/بحث على العميل) — العدد صغير حالياً.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Loader2, Search, WifiOff } from 'lucide-react';
import type { GuidanceListItem } from '@/lib/types';
import { fetchGuidanceList, ApiError } from '@/lib/api-client';
import { DOMAIN_KEYS, isDomainKey } from '@/lib/normalize';
import { domainChipTokens } from '@/lib/tokens';
import { DomainChip } from '@/components/ui/DomainChip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

const MAX_FETCH_SAFETY_CAP = 1000;

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function GuidanceBrowser() {
  const [items, setItems] = useState<GuidanceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      setLoading(true);
      setError(null);
      try {
        const collected: GuidanceListItem[] = [];
        let offset = 0;
        let total = Infinity;
        while (offset < total && collected.length < MAX_FETCH_SAFETY_CAP) {
          const page = await fetchGuidanceList({ limit: 100, offset });
          collected.push(...page.items);
          total = page.total;
          offset += page.items.length;
          if (page.items.length === 0) break;
        }
        if (!cancelled) setItems(collected);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? 'تعذّر الاتصال بخدمة الأدلة الإرشادية — تأكد من تشغيل الخادم وحاول مرة أخرى.'
              : 'حدث خطأ غير متوقع أثناء تحميل الأدلة الإرشادية.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadAll();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== 'all' && item.category !== category) return false;
      if (query && !item.title.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [items, category, search]);

  if (loading) {
    return (
      <div role="status" aria-busy="true" className="flex items-center justify-center gap-2 py-16 text-text-secondary">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        <span>جارٍ تحميل الأدلة الإرشادية…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-error-soft bg-error-soft px-6 py-10 text-center">
        <WifiOff className="h-8 w-8 text-error" aria-hidden="true" />
        <p className="text-body text-error">{error}</p>
        <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card-elevate flex flex-col gap-3 rounded-xl border border-border-default bg-surface p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-text-tertiary"
            aria-hidden="true"
          />
          <label htmlFor="guidance-search" className="sr-only">
            ابحث فى عناوين الأدلة الإرشادية
          </label>
          <input
            id="guidance-search"
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث بالعنوان…"
            className="h-11 w-full rounded-md border border-border-default bg-surface ps-9 pe-3 text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:shadow-[0_0_0_3px_var(--color-focus-ring)]"
          />
        </div>
        <label htmlFor="guidance-category" className="sr-only">
          المجال القانونى
        </label>
        <select
          id="guidance-category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="h-11 rounded-md border border-border-default bg-surface px-3 text-body-sm text-text-primary focus:outline-none focus-visible:shadow-[0_0_0_3px_var(--color-focus-ring)]"
        >
          <option value="all">كل المجالات</option>
          {DOMAIN_KEYS.map((key) => (
            <option key={key} value={key}>
              {domainChipTokens[key].label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-12 w-12" aria-hidden="true" />}
          title="لا توجد أدلة إرشادية مطابقة"
          description="جرّب تغيير كلمات البحث أو إزالة الفلتر."
        />
      ) : (
        <>
          <p className="text-body-sm text-text-tertiary">
            {filtered.length} من إجمالى {items.length} دليلاً إرشادياً
          </p>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {filtered.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/guidance/${item.id}`}
                  className="card-elevate flex h-full flex-col gap-2 rounded-xl border border-border-default bg-surface p-5 shadow-sm hover:border-primary-border hover:shadow-md focus-visible:outline-none"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {isDomainKey(item.category) ? <DomainChip domain={item.category} /> : null}
                  </div>
                  <h3 className="text-h4 font-bold leading-snug text-text-primary">{item.title}</h3>
                  {item.issuing_authority ? (
                    <p className="text-body-sm text-text-secondary">{item.issuing_authority}</p>
                  ) : null}
                  {item.related_law ? (
                    <p className="text-caption text-text-tertiary">
                      مرتبط بـ: {item.related_law.title} ({item.related_law.law_no}/{item.related_law.law_year})
                    </p>
                  ) : null}
                  <p className="mt-auto text-caption text-text-tertiary">{formatDate(item.issued_at)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
