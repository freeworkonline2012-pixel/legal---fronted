/**
 * صفحة الهبوط (S-01 في wireframes.md) — P8: فرق الثقة مرئي من أول شاشة.
 *
 * البنية:
 * - هيدر ثابت (بلا أزرار حساب فى v1 — انظر Header.showAuth).
 * - Hero: العنوان + حقل سؤال بارز + شارة الخصوصية (P5).
 * - تصفح مباشر: بطاقتا دخول لتصفح القوانين والأدلة الإرشادية (أُضيف 2026-08-27).
 * - مثال حي: سؤال → إجابة موثّقة → بطاقة مادة (P8).
 * - لماذا تثق بنا؟ + المجالات المتاحة.
 * - إخلاء مسؤولية ظاهر في التذييل (P7).
 */

import Link from 'next/link';
import { BookOpen, CheckCircle2, ChevronLeft, FileSearch, Lock, RefreshCcw, Scale, ShieldCheck } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { LandingQuestionForm } from '@/components/landing/LandingQuestionForm';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DomainChip } from '@/components/ui/DomainChip';
import type { DomainKey } from '@/lib/types';
import { DEMO_CITATION, DEMO_ANSWER } from '@/lib/demo-data';

const TRUST_POINTS = [
  { icon: ShieldCheck, text: 'استشهاد متحقق آلياً' },
  { icon: RefreshCcw, text: 'نرفض بدل التخمين' },
  { icon: FileSearch, text: 'تتبع تعديلات القوانين' },
  { icon: Lock, text: 'خصوصية وفق 151/2020' },
] as const;

const AVAILABLE_DOMAINS: DomainKey[] = [
  'labor',
  'rent',
  'personal_status',
  'traffic',
  'consumer_protection',
  'insurance',
  'aml_cft',
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-ui text-text-primary">
      <Header />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-10 sm:px-8">
        {/* Hero */}
        <section className="hero-glow py-8 text-center sm:py-14" aria-labelledby="hero-title">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-border bg-primary-soft px-4 py-1.5 text-body-sm font-medium text-primary">
            <FileSearch className="h-4 w-4" aria-hidden="true" />
            استرجاع موثّق من نصوص القانون الرسمية — لا توليد حر
          </span>

          <h1
            id="hero-title"
            className="mx-auto mt-6 max-w-3xl text-h1 font-bold leading-[1.3] sm:text-display sm:leading-[1.25]"
          >
            إجابتك القانونية…
            <br />
            <span className="text-primary">موثّقة بالمصدر، لا بالتخمين</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-body-lg text-text-secondary">
            اسأل بالعامية أو الفصحى — نرجع لك الإجابة مع رقم القانون والمادة وحالة نفاذها
            ورابط النص الرسمي. وإن لم نجد نصاً كافياً، نقول لك بصراحة بدل أن نخمّن.
          </p>

          <div className="card-elevate mx-auto mt-8 max-w-2xl rounded-xl border border-border-default bg-surface p-5 shadow-lg">
            <LandingQuestionForm />
          </div>
        </section>

        {/* تصفح مباشر: القوانين والأدلة الإرشادية (أُضيف 2026-08-27) */}
        <section aria-labelledby="browse-title" className="border-t border-border-default py-10">
          <h2 id="browse-title" className="text-center text-h2 font-bold text-text-primary">
            أو تصفّح النصوص مباشرة
          </h2>
          <div className="mx-auto mt-6 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
            <Link
              href="/laws"
              className="card-elevate group flex items-center gap-4 rounded-xl border border-border-default bg-surface p-5 shadow-sm hover:border-primary-border hover:shadow-md focus-visible:outline-none"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
                <Scale className="h-6 w-6 text-primary" aria-hidden="true" />
              </span>
              <span className="flex-1">
                <span className="block text-h4 font-bold text-text-primary">القوانين والقرارات</span>
                <span className="block text-body-sm text-text-secondary">تصفح وابحث بالمجال وحالة النفاذ</span>
              </span>
              <ChevronLeft className="h-5 w-5 shrink-0 rotate-180 text-text-tertiary group-hover:text-primary" aria-hidden="true" />
            </Link>
            <Link
              href="/guidance"
              className="card-elevate group flex items-center gap-4 rounded-xl border border-border-default bg-surface p-5 shadow-sm hover:border-primary-border hover:shadow-md focus-visible:outline-none"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
                <BookOpen className="h-6 w-6 text-primary" aria-hidden="true" />
              </span>
              <span className="flex-1">
                <span className="block text-h4 font-bold text-text-primary">الأدلة الإرشادية</span>
                <span className="block text-body-sm text-text-secondary">تعاميم وإجراءات تنفيذية غير مرقّمة</span>
              </span>
              <ChevronLeft className="h-5 w-5 shrink-0 rotate-180 text-text-tertiary group-hover:text-primary" aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* مثال حي (P8) */}
        <section
          aria-labelledby="live-example-title"
          className="mx-auto max-w-3xl border-t border-border-default py-10"
        >
          <h2 id="live-example-title" className="sr-only">
            مثال حي
          </h2>
          <div className="card-elevate rounded-xl border border-border-default bg-surface p-6 shadow-md">
            <div className="flex items-center justify-between">
              <h3 className="text-h3 font-bold text-text-primary">مثال حي — سؤال حقيقي</h3>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
                <Scale className="h-5 w-5 text-primary" aria-hidden="true" />
              </span>
            </div>

            <div className="mt-4 rounded-md bg-surface-muted p-4">
              <p className="text-body-sm text-text-tertiary">السؤال</p>
              <p className="mt-1 text-body-lg text-text-primary">
                «اتنفصلت من الشغل من غير إشعار، ليا حق تعويض؟»
              </p>
            </div>

            <div className="mt-4 rounded-md bg-surface-muted p-4">
              <p className="text-body-sm text-text-tertiary">الإجابة (مبسطة)</p>
              <p className="mt-1 text-body-lg text-text-primary">{DEMO_ANSWER.answer}</p>
              <div className="mt-4 rounded-md border border-border-default bg-surface-inset p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-body font-semibold text-text-primary">
                    {DEMO_CITATION.law} {DEMO_CITATION.law_no}/{DEMO_CITATION.law_year} — مادة{' '}
                    {DEMO_CITATION.article_no}
                  </p>
                  <StatusBadge status={DEMO_CITATION.status} />
                </div>
                <p className="mt-2 text-body-sm text-text-tertiary">
                  آخر تعديل: <span dir="ltr">{DEMO_CITATION.last_amended}</span>
                </p>
              </div>
              <a
                href={DEMO_CITATION.official_url ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-[44px] items-center text-body-sm font-medium text-link underline underline-offset-4 hover:text-primary-hover focus-visible:outline-none"
              >
                افتح النص الرسمي ↗
              </a>
            </div>
          </div>
        </section>

        {/* لماذا تثق بنا؟ */}
        <section aria-labelledby="trust-title" className="border-t border-border-default py-10">
          <h2 id="trust-title" className="text-center text-h2 font-bold text-text-primary">
            لماذا تثق بنا؟
          </h2>
          <ul className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
            {TRUST_POINTS.map((point) => {
              const Icon = point.icon;
              return (
                <li
                  key={point.text}
                  className="card-elevate flex items-center gap-3 rounded-xl border border-border-default bg-surface p-4"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-soft">
                    <Icon className="h-5 w-5 text-success" aria-hidden="true" />
                  </span>
                  <span className="text-body font-medium text-text-primary">{point.text}</span>
                  <CheckCircle2 className="ms-auto h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                </li>
              );
            })}
          </ul>
        </section>

        {/* المجالات المتاحة */}
        <section aria-labelledby="domains-title" className="border-t border-border-default py-10">
          <h2 id="domains-title" className="text-center text-h2 font-bold text-text-primary">
            المجالات المتاحة
          </h2>
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {AVAILABLE_DOMAINS.map((domain) => (
              <li key={domain} className="card-elevate rounded-full">
                <DomainChip domain={domain} />
              </li>
            ))}
          </ul>
          <p className="mt-4 text-center text-body-sm text-text-tertiary">
            تغطية موسّعة لبقية التشريعات المصرية قادمة في مراحل لاحقة.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
