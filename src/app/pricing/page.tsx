/**
 * صفحة خطط الاشتراك والدفع (S-07 في wireframes + F-09).
 *
 * ⚠️ قرار مالك معلّق: فترة التجربة المجانية 7 أيام افتراضية من التصميم
 * (موثّقة في _reports/ui_latest.json) — تُحسم قبل الربط الفعلي بالدفع.
 * بوابة الدفع المصرية (Paymob/Fawry) ضمن Phase 3 — الأزرار توجّه للتسجيل حالياً.
 */

import { Check, CreditCard, Crown } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ButtonLink } from '@/components/ui/Button';

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  ctaLabel: string;
}

const PLANS: Plan[] = [
  {
    id: 'trial',
    name: 'تجربة مجانية',
    price: '0 ج.م',
    period: '7 أيام',
    description: 'جرّب المنصة بالكامل قبل أي التزام.',
    features: ['5 أسئلة يومياً', 'إجابات موثّقة بالمصدر', 'بطاقات الاستشهاد الكاملة', 'بدون بطاقة دفع'],
    ctaLabel: 'ابدأ التجربة',
  },
  {
    id: 'monthly',
    name: 'الخطة الشهرية',
    price: '99 ج.م',
    period: 'شهرياً',
    description: 'للاستخدام المنتظم والأسئلة المتكررة.',
    features: ['أسئلة غير محدودة', 'سجل أسئلة كامل', 'أسئلة متابعة بسياق المحادثة', 'أولوية في المراجعة البشرية', 'تصدير البيانات (151/2020)'],
    highlighted: true,
    ctaLabel: 'اشترك شهرياً',
  },
  {
    id: 'yearly',
    name: 'الخطة السنوية',
    price: '899 ج.م',
    period: 'سنوياً (وفر 25%)',
    description: 'للمحامين والباحثين القانونيين.',
    features: ['كل مزايا الشهرية', 'تحديثات فورية للقوانين', 'مرجع سريع للمواد', 'دعم ذو أولوية'],
    ctaLabel: 'اشترك سنوياً',
  },
];

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-ui text-text-primary">
      <Header />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-10 sm:px-8">
        <section className="text-center" aria-labelledby="pricing-title">
          <h1 id="pricing-title" className="text-h1 font-bold text-text-primary">
            خطط بسيطة، بلا مفاجآت
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-body-lg text-text-secondary">
            ابدأ مجاناً، ثم اختر الخطة التي تناسب استخدامك. الدفع بوسائل مصرية محلية
            (Paymob / Fawry) — قريباً.
          </p>
        </section>

        <section aria-label="خطط الاشتراك" className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              aria-label={plan.name}
              className={`flex flex-col rounded-xl border p-6 ${
                plan.highlighted
                  ? 'border-primary-border bg-primary-soft shadow-lg'
                  : 'border-border-default bg-surface shadow-md'
              }`}
            >
              <div className="flex items-center gap-2">
                {plan.highlighted ? (
                  <Crown className="h-5 w-5 text-primary" aria-hidden="true" />
                ) : (
                  <CreditCard className="h-5 w-5 text-text-tertiary" aria-hidden="true" />
                )}
                <h2 className="text-h4 font-semibold text-text-primary">{plan.name}</h2>
              </div>

              <p className="mt-4">
                <span className="text-display font-bold text-text-primary">{plan.price}</span>
                <span className="text-body-sm text-text-secondary"> / {plan.period}</span>
              </p>
              <p className="mt-2 text-body-sm text-text-secondary">{plan.description}</p>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-body-sm text-text-primary">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <ButtonLink
                href="/login?mode=signup"
                variant={plan.highlighted ? 'primary' : 'secondary'}
                className="mt-6 w-full"
              >
                {plan.ctaLabel}
              </ButtonLink>
            </article>
          ))}
        </section>

        <p className="mx-auto mt-8 max-w-2xl text-center text-caption text-text-tertiary">
          الأسعار استرشادية للمرحلة الأولى — تُعتمد نهائياً بقرار المالك قبل الربط ببوابة الدفع.
        </p>
      </main>

      <Footer />
    </div>
  );
}
