'use client';

/**
 * مكوّن LawsBrowser — تصفح القوانين والقرارات (/laws).
 *
 * ملاحظة تصميمية مهمة: عقد backend الفعلى (GET /api/laws) لا يوفّر بحثاً نصياً
 * حراً — فقط فلترة بالمجال/الحالة وترقيم صفحات. بما أن إجمالى عدد القوانين
 * محدود حالياً (~127)، نجلبها كاملة عبر ترقيم صفحات داخلى (حتى limit=100 لكل
 * طلب حسب حد backend) ثم نطبّق البحث النصى والفلترة على العميل — حل صادق
 * ومناسب لهذا الحجم، وليس بديلاً وهمياً عن بحث خادم حقيقى لو تضخّم العدد لاحقاً.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FileSearch, Loader2, Search, WifiOff } from 'lucide-react';
import type { LawItem, LawStatusKey } from '@/lib/types';
import { fetchLaws, ApiError } from '@/lib/api-client';
import { DOMAIN_KEYS, isDomainKey } from '@/lib/normalize';
import { domainChipTokens } from '@/lib/tokens';
import { DomainChip } from '@/components/ui/DomainChip';
import { LawStatusBadge } from '@/components/ui/LawStatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

const STATUS_OPTIONS: ReadonlyArray<{ value: LawStatusKey; label: string }> = [
  { value: 'in_force', label: 'سارٍ' },
  { value: 'amended', label: 'معدّل' },
  { value: 'repealed', label: 'ملغى' },
];

const MAX_FETCH_SAFETY_CAP = 1000;

export interface LawsBrowserProps {
  /** فئة مبدئية من رابط عميق (؟category=) */
  initialCategory?: string;
}

export function LawsBrowser({ initialCategory }: LawsBrowserProps) {
  const [laws, setLaws] = useState<LawItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>(
    initialCategory && isDomainKey(initialCategory) ? initialCategory : 'all',
  );
  const [status, setStatus] = useState<'all' | LawStatusKey>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setLoading(true);
      setError(null);
      try {
        const collected: LawItem[] = [];
        let offset = 0;
        let total = Infinity;
        while (offset < total && collected.length < MAX_FETCH_SAFETY_CAP) {
          const page = await fetchLaws({ limit: 100, offset });
          collected.push(...page.items);
          total = page.total;
          offset += page.items.length;
          if (page.items.length === 0) break; // حارس أمان — يمنع حلقة لا نهائية لو سلوك backend غير متوقع
        }
        if (!cancelled) setLaws(collected);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? 'تعذّر الاتصال بخدمة القوانين — تأكد من تشغيل الخادم وحاول مرة أخرى.'
              : 'حدث خطأ غير متوقع أثناء تحميل القوانين.',
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
    return laws.filter((law) => {
      if (category !== 'all' && law.category !== category) return false;
      if (status !== 'all' && law.status !== status) return false;
      if (query) {
        const haystack = `${law.title} ${law.short_title ?? ''} ${law.law_no}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [laws, category, status, search]);

  return (
    <div className="space-y-6">
      {/* شريط الفلترة والبحث */}
      <div className="card-elevate flex flex-col gap-3 rounded-xl border border-border-default bg-surface p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-text-tertiary"
            aria-hidden="true"
          />
          <label htmlFor="laws-search" className="sr-only">
            ابحث فى عناوين القوانين
          </label>
          <input
            id="laws-search"
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث بالعنوان أو رقم القانون…"
            className="h-11 w-full rounded-md border border-border-default bg-surface ps-9 pe-3 text-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:shadow-[0_0_0_3px_var(--color-focus-ring)]"
          />
        </div>

        <label htmlFor="laws-category" className="sr-only">
          المجال القانونى
        </label>
        <select
          id="laws-category"
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

        <label htmlFor="laws-status" className="sr-only">
          حالة النفاذ
        </label>
        <select
          id="laws-status"
          value={status}
          onChange={(event) => setStatus(event.target.value as 'all' | LawStatusKey)}
          className="h-11 rounded-md border border-border-default bg-surface px-3 text-body-sm text-text-primary focus:outline-none focus-visible:shadow-[0_0_0_3px_var(--color-focus-ring)]"
        >
          <option value="all">كل الحالات</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* حالة التحميل */}
      {loading ? (
        <div role="status" aria-busy="true" className="flex items-center justify-center gap-2 py-16 text-text-secondary">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span>جارٍ تحميل القوانين…</span>
        </div>
      ) : error ? (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-error-soft bg-error-soft px-6 py-10 text-center">
          <WifiOff className="h-8 w-8 text-error" aria-hidden="true" />
          <p className="text-body text-error">{error}</p>
          <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
            إعادة المحاولة
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileSearch className="h-12 w-12" aria-hidden="true" />}
          title="لا توجد نتائج مطابقة"
          description="جرّب تغيير كلمات البحث أو إزالة بعض الفلاتر."
        />
      ) : (
        <>
          <p className="text-body-sm text-text-tertiary">
            {filtered.length} من إجمالى {laws.length} قانوناً وقراراً
          </p>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((law) => (
              <li key={law.id}>
                <Link
                  href={`/laws/${law.id}`}
                  className="card-elevate flex h-full flex-col gap-3 rounded-xl border border-border-default bg-surface p-5 shadow-sm hover:border-primary-border hover:shadow-md focus-visible:outline-none"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {isDomainKey(law.category) ? (
                      <DomainChip domain={law.category} />
                    ) : (
                      <span className="text-body-sm text-text-tertiary">{law.category}</span>
                    )}
                    <LawStatusBadge status={law.status} />
                  </div>
                  <h3 className="text-h4 font-bold leading-snug text-text-primary">
                    {law.short_title ?? law.title}
                  </h3>
                  {law.short_title ? (
                    <p className="line-clamp-2 text-body-sm text-text-secondary">{law.title}</p>
                  ) : null}
                  <p className="mt-auto text-body-sm font-medium text-text-tertiary" dir="ltr">
                    {law.law_no}/{law.law_year}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
