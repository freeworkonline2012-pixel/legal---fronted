/**
 * مكوّن MainSidebar — "القائمة الرئيسية" فى الشريط الجانبى.
 *
 * 1. القائمة الرئيسية: قائمة منسدلة "الوطن العربى" (مفتوحة افتراضياً) تضم كل
 *    الدول المستهدفة (مصر، السعودية، الإمارات، قطر، البحرين) — بطلب صريح
 *    2026-10-16. كل دولة تُفتح لتُظهر "المكتبة القانونية" وتحتها ست قوائم
 *    منسدلة تضم كل عناصرها فعلاً (لا عناوين مختارة): القوانين، القرارات،
 *    اللوائح التنفيذية، الأدلة الإرشادية، مراجع قانونية، أحكام قضائية.
 *    رمز XA (الوطن العربى فى جدول الدول، migration 206) محجوز للمحتوى العابر
 *    للدول مستقبلاً ولا يُعرض كدولة داخل القائمة.
 *    - القوانين/القرارات: من /api/laws (kind=law، وDECISION_KINDS على التوالى).
 *    - الأدلة الإرشادية: من /api/guidance?country= — تُجلب عند فتح الدولة.
 *    - مراجع قانونية وأحكام قضائية: لا يوجد لهما بعد جدول ولا API فى الخلفية؛
 *      القائمتان موجودتان وفارغتان بحالة "ستُضاف قريباً" حتى يُرفع محتواهما
 *      (لا بيانات وهمية).
 *    كل قائمة منسدلة قابلة للتمرير مع حقل بحث عندما تطول، ورابط "عرض الكل"
 *    للصفحة الكاملة.
 *    الدول التى لا تحتوى أى قانون تظهر بشارة "قريباً" ولا تُفتح.
 * 2. محادثاتى: تظهر فقط بعد تسجيل الدخول (isAuthenticated). ⚠️ المرحلة
 *    الحالية: هذا القسم شكلى (بيانات وهمية) — لا يوجد بعد تخزين محادثات فعلى
 *    فى الخلفية (قرار عمل موثّق: "إخفاء خلف تسجيل الدخول فقط الآن"، مرحلة
 *    تالية منفصلة لبناء جدول/API محادثات حقيقيين). الإخفاء عن الزوار غير
 *    المسجّلين حقيقى وفعلى (isAuthenticated من jwt session).
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Clock, Globe2, Loader2, MessageSquarePlus } from 'lucide-react';
import type { CountryItem, GuidanceListItem, LawItem } from '@/lib/types';
import { fetchCountries, fetchGuidanceList, fetchLaws } from '@/lib/api-client';
import { DECISION_KINDS } from '@/lib/law-kind';
import { isAuthenticated } from '@/lib/auth';

const MAX_FETCH_SAFETY_CAP = 1000;
const PAGE_SIZE = 100;

/** رمز "الوطن العربى" فى جدول الدول (migration 206): مجموعة لا دولة، فلا تُعرض داخل قائمة الدول. */
const ARAB_WORLD_CODE = 'XA';

/** عدد العناصر الذى يظهر عنده حقل البحث داخل القائمة المنسدلة. */
const FILTER_THRESHOLD = 8;

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

interface DropdownEntry {
  id: string;
  label: string;
  href: string;
}

type GuidanceState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; items: GuidanceListItem[] };

export function MainSidebar({
  conversations,
  activeConversationId,
  onSelect,
  onNewConversation,
}: MainSidebarProps) {
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [countriesError, setCountriesError] = useState(false);
  const [lawsByCountry, setLawsByCountry] = useState<Map<string, LawItem[]>>(new Map());
  const [lawsFailed, setLawsFailed] = useState(false);
  const [guidanceByCountry, setGuidanceByCountry] = useState<Map<string, GuidanceState>>(new Map());
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);
  const [arabWorldOpen, setArabWorldOpen] = useState(true);
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
        // الدول هى الأساس: فشلها يعنى لا شجرة. القوانين تُجلب بالتوازى وفشلها
        // لا يُسقط الشجرة (تظهر القوائم بحالة خطأ) — allSettled لا Promise.all.
        const [countriesRes, lawsRes] = await Promise.allSettled([fetchCountries(), fetchAllLaws()]);
        if (cancelled) return;
        if (countriesRes.status === 'rejected') {
          setCountriesError(true);
          return;
        }
        setCountries(countriesRes.value.items);

        if (lawsRes.status === 'fulfilled') {
          const grouped = new Map<string, LawItem[]>();
          for (const law of lawsRes.value) {
            const list = grouped.get(law.country_code) ?? [];
            list.push(law);
            grouped.set(law.country_code, list);
          }
          setLawsByCountry(grouped);
        } else {
          setLawsFailed(true);
        }
      } finally {
        if (!cancelled) setCountriesLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // الأدلة الإرشادية تُجلب عند فتح الدولة لأول مرة فقط (مخزَّنة بعدها). مفتاح
  // "طُلبت من قبل" فى ref لا فى state: تغيّر state الخريطة لا يجب أن يُعيد
  // تشغيل التأثير فيُلغى الطلب الجارى.
  const requestedGuidance = useRef<Set<string>>(new Set());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!expandedCountry || requestedGuidance.current.has(expandedCountry)) return;
    const code = expandedCountry;
    requestedGuidance.current.add(code);
    const setState = (state: GuidanceState) => {
      if (mounted.current) setGuidanceByCountry((prev) => new Map(prev).set(code, state));
    };
    // بدء حالة التحميل عند أول فتح للدولة.
    setState({ status: 'loading' });
    fetchAllGuidance(code).then(
      (items) => setState({ status: 'ready', items }),
      () => {
        requestedGuidance.current.delete(code); // يسمح بإعادة المحاولة عند الفتح التالى
        setState({ status: 'error' });
      },
    );
  }, [expandedCountry]);

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
          <div>
            <button
              type="button"
              aria-expanded={arabWorldOpen}
              aria-controls="arab-world-countries"
              onClick={() => setArabWorldOpen((v) => !v)}
              className="flex min-h-[44px] w-full items-center gap-2 rounded-md px-3 text-start text-body-sm font-semibold text-text-primary transition-colors duration-[120ms] hover:bg-surface focus-visible:outline-none"
            >
              <Globe2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="flex-1 truncate">الوطن العربى</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform duration-[120ms] ${
                  arabWorldOpen ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>
            {arabWorldOpen ? (
              <div id="arab-world-countries" className="me-2 mt-1 border-e border-border-default ps-3">
                <ul className="space-y-1">
                  {countries.filter((c) => c.code !== ARAB_WORLD_CODE).map((country) => {
                    const isComingSoon = country.law_count === 0 || !country.is_active;
                    const isExpanded = expandedCountry === country.code;

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
                          <CountryLibrary
                            countryCode={country.code}
                            laws={lawsByCountry.get(country.code) ?? []}
                            lawsFailed={lawsFailed}
                            guidance={guidanceByCountry.get(country.code) ?? { status: 'loading' }}
                          />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
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

/** تحميل كل القوانين (كل الدول): الصفحة الأولى ثم الباقى بالتوازى (أسرع من التسلسل). */
async function fetchAllLaws(): Promise<LawItem[]> {
  const first = await fetchLaws({ limit: PAGE_SIZE, offset: 0 });
  const collected = [...first.items];
  if (first.items.length === 0) return collected; // حارس أمان — يمنع حلقة لو سلوك backend غير متوقع
  const offsets: number[] = [];
  for (let o = collected.length; o < Math.min(first.total, MAX_FETCH_SAFETY_CAP); o += PAGE_SIZE) {
    offsets.push(o);
  }
  const rest = await Promise.all(offsets.map((offset) => fetchLaws({ limit: PAGE_SIZE, offset })));
  for (const page of rest) collected.push(...page.items);
  return collected;
}

/** كل أدلة دولة واحدة: الصفحة الأولى ثم الباقى بالتوازى (بحد أمان). */
async function fetchAllGuidance(country: string): Promise<GuidanceListItem[]> {
  const first = await fetchGuidanceList({ country, limit: PAGE_SIZE, offset: 0 });
  const items = [...first.items];
  if (first.items.length === 0) return items;
  const offsets: number[] = [];
  for (let o = items.length; o < Math.min(first.total, MAX_FETCH_SAFETY_CAP); o += PAGE_SIZE) {
    offsets.push(o);
  }
  const rest = await Promise.all(
    offsets.map((offset) => fetchGuidanceList({ country, limit: PAGE_SIZE, offset })),
  );
  for (const page of rest) items.push(...page.items);
  return items;
}

function lawEntry(law: LawItem): DropdownEntry {
  return { id: law.id, label: law.short_title || law.title, href: `/laws/${law.id}` };
}

/** "المكتبة القانونية" لدولة واحدة: خمس قوائم منسدلة + رابط اللوائح التنفيذية. */
function CountryLibrary({
  countryCode,
  laws,
  lawsFailed,
  guidance,
}: {
  countryCode: string;
  laws: LawItem[];
  lawsFailed: boolean;
  guidance: GuidanceState;
}) {
  const lawEntries = useMemo(
    () => laws.filter((law) => law.kind === 'law').map(lawEntry),
    [laws],
  );
  const decisionEntries = useMemo(
    () => laws.filter((law) => DECISION_KINDS.includes(law.kind as (typeof DECISION_KINDS)[number])).map(lawEntry),
    [laws],
  );
  const regulationEntries = useMemo(
    () => laws.filter((law) => law.kind === 'regulation').map(lawEntry),
    [laws],
  );
  const guidanceEntries = useMemo<DropdownEntry[]>(
    () =>
      guidance.status === 'ready'
        ? guidance.items.map((g) => ({ id: g.id, label: g.title, href: `/guidance/${g.id}` }))
        : [],
    [guidance],
  );

  const lawsStatus = lawsFailed ? 'error' : 'ready';

  return (
    <div className="me-2 mt-1 border-e border-border-default ps-3">
      <p className="px-2 pt-1 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
        المكتبة القانونية
      </p>
      <ul className="mt-0.5 space-y-0.5">
        <li>
          <LibraryDropdown
            label="القوانين"
            entries={lawEntries}
            status={lawsStatus}
            viewAllHref={`/laws?country=${countryCode}`}
          />
        </li>
        <li>
          <LibraryDropdown
            label="القرارات"
            entries={decisionEntries}
            status={lawsStatus}
            viewAllHref={`/decisions?country=${countryCode}`}
          />
        </li>
        <li>
          <LibraryDropdown
            label="اللوائح التنفيذية"
            entries={regulationEntries}
            status={lawsStatus}
            viewAllHref={`/regulations?country=${countryCode}`}
          />
        </li>
        <li>
          <LibraryDropdown
            label="الأدلة الإرشادية"
            entries={guidanceEntries}
            status={guidance.status}
            viewAllHref="/guidance"
          />
        </li>
        <li>
          <LibraryDropdown label="مراجع قانونية" entries={[]} status="ready" emptyText="ستُضاف قريباً" />
        </li>
        <li>
          <LibraryDropdown label="أحكام قضائية" entries={[]} status="ready" emptyText="ستُضاف قريباً" />
        </li>
      </ul>
    </div>
  );
}

/**
 * قائمة منسدلة (disclosure) تضم كل عناصر نوع محتوى: زر بالعنوان والعدد،
 * وعند الفتح قائمة روابط قابلة للتمرير (مع بحث حين تطول) ورابط "عرض الكل".
 */
function LibraryDropdown({
  label,
  entries,
  status,
  viewAllHref,
  emptyText = 'لا توجد عناصر بعد',
}: {
  label: string;
  entries: DropdownEntry[];
  status: 'loading' | 'error' | 'ready';
  viewAllHref?: string;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const panelId = `lib-${label.replace(/\s+/g, '-')}`;

  const visible = useMemo(() => {
    const q = filter.trim();
    return q ? entries.filter((e) => e.label.includes(q)) : entries;
  }, [entries, filter]);

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[36px] w-full items-center gap-2 rounded-md px-2 text-start text-body-sm font-medium text-text-secondary hover:bg-surface hover:text-text-primary focus-visible:outline-none"
      >
        <span className="flex-1 truncate">{label}</span>
        {status === 'ready' ? (
          <span className="text-[11px] text-text-tertiary" dir="ltr">
            {entries.length}
          </span>
        ) : null}
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform duration-[120ms] ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div id={panelId} className="me-2 mt-0.5 border-e border-border-default ps-3">
          {status === 'loading' ? (
            <p className="flex items-center gap-2 px-2 py-2 text-body-sm text-text-tertiary">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              جارٍ التحميل…
            </p>
          ) : status === 'error' ? (
            <p className="px-2 py-2 text-body-sm text-text-tertiary">تعذّر التحميل حالياً.</p>
          ) : entries.length === 0 ? (
            <p className="px-2 py-2 text-body-sm text-text-tertiary">{emptyText}</p>
          ) : (
            <>
              {entries.length > FILTER_THRESHOLD ? (
                <input
                  type="search"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder={`بحث فى ${label}`}
                  aria-label={`بحث فى ${label}`}
                  className="mb-1 mt-1 w-full rounded-md border border-border-default bg-surface px-2 py-1 text-body-sm text-text-primary placeholder:text-text-tertiary focus-visible:outline-none"
                />
              ) : null}
              <ul className="max-h-64 space-y-0.5 overflow-y-auto">
                {visible.map((entry) => (
                  <li key={entry.id}>
                    <Link
                      href={entry.href}
                      title={entry.label}
                      className="block rounded-md px-2 py-1.5 text-body-sm leading-snug text-text-secondary hover:bg-surface hover:text-text-primary"
                    >
                      <span className="line-clamp-2">{entry.label}</span>
                    </Link>
                  </li>
                ))}
                {visible.length === 0 ? (
                  <li className="px-2 py-2 text-body-sm text-text-tertiary">لا نتائج مطابقة.</li>
                ) : null}
              </ul>
              {viewAllHref ? (
                <Link
                  href={viewAllHref}
                  className="mt-1 flex min-h-[32px] items-center rounded-md px-2 text-body-sm font-medium text-primary hover:underline"
                >
                  عرض الكل
                </Link>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
