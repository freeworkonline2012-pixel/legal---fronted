/**
 * مكوّن MainSidebar — "القائمة الرئيسية" فى الشريط الجانبى (كان ChatSidebar
 * "محادثاتى" سابقاً، أُعيدت هيكلته بالكامل).
 *
 * البنية الجديدة:
 * 1. القائمة الرئيسية: شجرة تصفح بالدولة المستهدفة (مصر أولاً، ثم السعودية/
 *    الإمارات/قطر/البحرين) — كل دولة تُفتح لتُظهر المجالات القانونية المتوفرة
 *    فيها بعدد القوانين الفعلى لكل مجال، وتؤدى إلى /laws?country=..&category=..
 *    (صفحة LawsBrowser الكاملة هى مصدر عرض القوانين فعلياً — الشريط الجانبى
 *    للتصفح لا لعرض مئات العناوين فى مساحة 280px). الدول التى لا تحتوى أى
 *    قانون مُدخَل بعد تظهر بشارة "قريباً" ولا تُفتح.
 * 2. محادثاتى: تظهر فقط بعد تسجيل الدخول (isAuthenticated). ⚠️ المرحلة
 *    الحالية: هذا القسم شكلى (بيانات وهمية) — لا يوجد بعد تخزين محادثات فعلى
 *    فى الخلفية (قرار عمل موثّق: "إخفاء خلف تسجيل الدخول فقط الآن"، مرحلة
 *    تالية منفصلة لبناء جدول/API محادثات حقيقيين). الإخفاء عن الزوار غير
 *    المسجّلين حقيقى وفعلى (isAuthenticated من jwt session)، وهذا ما تغيّر
 *    فعلياً فى هذه الدفعة — لا مجرد رسم شكلى.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Clock, Globe2, Loader2, MessageSquarePlus } from 'lucide-react';
import type { CountryItem, LawItem } from '@/lib/types';
import { fetchCountries, fetchLaws } from '@/lib/api-client';
import { isAuthenticated } from '@/lib/auth';
import { isDomainKey } from '@/lib/normalize';
import { domainChipTokens } from '@/lib/tokens';

const MAX_FETCH_SAFETY_CAP = 1000;

export interface ChatConversation {
  id: string;
  title: string;
  active?: boolean;
}

export interface MainSidebarProps {
  conversations: ChatConversation[];
  activeConversationId?: string;
  onSelect?: (id: string) => void;
  onNewConversation?: () => void;
}

interface CategoryCount {
  category: string;
  count: number;
}

export function MainSidebar({
  conversations,
  activeConversationId,
  onSelect,
  onNewConversation,
}: MainSidebarProps) {
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [countriesError, setCountriesError] = useState(false);
  const [lawsByCountry, setLawsByCountry] = useState<Map<string, CategoryCount[]>>(new Map());
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);
  const [showChats, setShowChats] = useState(false);

  // isAuthenticated تعتمد على sessionStorage (غير متاح فى SSR) — تُفحص بعد
  // التركيب على العميل فقط، بلا وميض hydration (البداية false فى الخادم
  // والعميل معاً، ثم تتحدّث محلياً إن وُجدت جلسة فعلية).
  useEffect(() => {
    // متعمّد: sessionStorage (auth.ts) متاح للعميل فقط؛ تهيئة كسولة ستقرأه أثناء
    // hydration فتكسر تطابق SSR — نفس نمط Header.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowChats(isAuthenticated());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setCountriesLoading(true);
      setCountriesError(false);
      try {
        const [countriesRes, laws] = await Promise.all([
          fetchCountries(),
          fetchAllLaws(),
        ]);
        if (cancelled) return;

        setCountries(countriesRes.items);

        const grouped = new Map<string, Map<string, number>>();
        for (const law of laws) {
          const byCategory = grouped.get(law.country_code) ?? new Map<string, number>();
          byCategory.set(law.category, (byCategory.get(law.category) ?? 0) + 1);
          grouped.set(law.country_code, byCategory);
        }
        const result = new Map<string, CategoryCount[]>();
        for (const [countryCode, byCategory] of grouped) {
          result.set(
            countryCode,
            Array.from(byCategory.entries())
              .map(([category, count]) => ({ category, count }))
              .sort((a, b) => b.count - a.count),
          );
        }
        setLawsByCountry(result);
      } catch {
        if (!cancelled) setCountriesError(true);
      } finally {
        if (!cancelled) setCountriesLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleCountry(code: string) {
    setExpandedCountry((prev) => (prev === code ? null : code));
  }

  return (
    <aside
      aria-label="القائمة الرئيسية"
      className="hidden w-[280px] shrink-0 flex-col overflow-y-auto border-e border-border-default bg-surface-muted lg:flex"
    >
      <div className="px-4 pt-6">
        <h2 className="text-h4 font-semibold text-text-primary">القائمة الرئيسية</h2>
        <p className="mt-1 text-body-sm text-text-tertiary">القوانين والقرارات حسب الدولة</p>
      </div>

      {/* شجرة الدول */}
      <nav aria-label="تصفح حسب الدولة" className="mt-4 px-3">
        {countriesLoading ? (
          <div className="flex items-center gap-2 px-3 py-4 text-body-sm text-text-tertiary">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            جارٍ تحميل الدول…
          </div>
        ) : countriesError ? (
          <p className="px-3 py-4 text-body-sm text-text-tertiary">
            تعذّر تحميل قائمة الدول حالياً.
          </p>
        ) : (
          <ul className="space-y-1">
            {countries.map((country) => {
              const isComingSoon = country.law_count === 0 || !country.is_active;
              const isExpanded = expandedCountry === country.code;
              const categories = lawsByCountry.get(country.code) ?? [];

              return (
                <li key={country.code}>
                  <button
                    type="button"
                    disabled={isComingSoon}
                    aria-expanded={isComingSoon ? undefined : isExpanded}
                    onClick={() => !isComingSoon && toggleCountry(country.code)}
                    className={`flex min-h-[44px] w-full items-center gap-2 rounded-md px-3 text-start text-body-sm transition-colors duration-[120ms] focus-visible:outline-none ${
                      isComingSoon
                        ? 'cursor-default text-text-tertiary'
                        : 'text-text-secondary hover:bg-surface hover:text-text-primary'
                    }`}
                  >
                    <Globe2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="flex-1 truncate font-medium">{country.name_ar}</span>
                    {isComingSoon ? (
                      <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-text-tertiary">
                        قريباً
                      </span>
                    ) : (
                      <>
                        <span className="text-[11px] text-text-tertiary" dir="ltr">
                          {country.law_count}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 transition-transform duration-[120ms] ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                          aria-hidden="true"
                        />
                      </>
                    )}
                  </button>

                  {isExpanded && !isComingSoon ? (
                    <ul className="me-2 mt-1 space-y-0.5 border-e border-border-default ps-3">
                      <li>
                        <Link
                          href={`/laws?country=${country.code}`}
                          className="flex min-h-[36px] items-center rounded-md px-2 text-body-sm text-text-secondary hover:bg-surface hover:text-text-primary"
                        >
                          كل قوانين {country.name_ar}
                        </Link>
                      </li>
                      {categories.map(({ category, count }) => (
                        <li key={category}>
                          <Link
                            href={`/laws?country=${country.code}&category=${category}`}
                            className="flex min-h-[36px] items-center justify-between gap-2 rounded-md px-2 text-body-sm text-text-secondary hover:bg-surface hover:text-text-primary"
                          >
                            <span className="truncate">
                              {isDomainKey(category) ? domainChipTokens[category].label : category}
                            </span>
                            <span className="text-[11px] text-text-tertiary" dir="ltr">
                              {count}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      {/* محادثاتى — تظهر فقط بعد تسجيل الدخول (راجع تعليق أعلى الملف) */}
      {showChats ? (
        <>
          <div className="mx-3 mt-6 border-t border-border-default pt-4">
            <h2 className="px-1 text-h4 font-semibold text-text-primary">محادثاتى</h2>
          </div>

          <ul className="mt-2 flex-1 space-y-1 overflow-y-auto px-3">
            {conversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId;
              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => onSelect?.(conversation.id)}
                    aria-current={isActive ? 'true' : undefined}
                    className={`flex min-h-[44px] w-full items-center gap-2 rounded-md px-3 text-start text-body-sm transition-colors duration-[120ms] focus-visible:outline-none ${
                      isActive
                        ? 'bg-primary-soft text-primary'
                        : 'text-text-secondary hover:bg-surface hover:text-text-primary'
                    }`}
                  >
                    <span aria-hidden="true" className={isActive ? 'text-primary' : 'text-text-tertiary'}>
                      ●
                    </span>
                    <span className="truncate">{conversation.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="p-3">
            <button
              type="button"
              onClick={onNewConversation}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md border border-border-strong bg-surface px-3 text-body-sm font-medium text-primary hover:bg-primary-soft focus-visible:outline-none"
            >
              <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
              محادثة جديدة
            </button>
          </div>
        </>
      ) : (
        <div className="mx-3 mt-6 flex items-center gap-2 rounded-md border border-dashed border-border-default px-3 py-3 text-body-sm text-text-tertiary">
          <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <Link href="/login" className="font-medium text-primary hover:underline">
              سجّل الدخول
            </Link>{' '}
            لحفظ محادثاتك والرجوع إليها لاحقاً.
          </span>
        </div>
      )}
    </aside>
  );
}

/** تحميل كل القوانين (كل الدول) عبر ترقيم صفحات داخلى — نفس نمط LawsBrowser. */
async function fetchAllLaws(): Promise<LawItem[]> {
  const collected: LawItem[] = [];
  let offset = 0;
  let total = Infinity;
  while (offset < total && collected.length < MAX_FETCH_SAFETY_CAP) {
    const page = await fetchLaws({ limit: 100, offset });
    collected.push(...page.items);
    total = page.total;
    offset += page.items.length;
    if (page.items.length === 0) break;
  }
  return collected;
}
