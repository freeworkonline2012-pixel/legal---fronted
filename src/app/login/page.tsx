'use client';

/**
 * صفحة تسجيل الدخول / إنشاء حساب (S-06 في wireframes + F-14 + 151/2020).
 *
 * المصادقة (H-2): النموذج موصول فعلياً بـ backend:
 * - تسجيل دخول → POST /api/auth/login
 * - حساب جديد → POST /api/auth/register (مع موافقة 151/2020 أمامية)
 * - تُحفظ الجلسة في sessionStorage (src/lib/auth.ts — حد أدنى من التخزين، حصرية للتبويب).
 * - لا تُرسَل أي بيانات حساسة خارج HTTPS في الإنتاج (Secrets في متغيرات البيئة فقط).
 */

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Scale } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner';
import { useToast } from '@/components/ui/Toast';
import { loginUser, registerUser } from '@/lib/api-client';
import { setAuthSession } from '@/lib/auth';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; consent?: string; server?: string }>({});
  const [loading, setLoading] = useState(false);

  // قراءة ?mode=signup (من زر «جرّب مجاناً» في الهيدر) — client-only لتجنّب تعقيد Suspense.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'signup') {
      // متعمّد: window.location مصدر خارجي للعميل فقط؛ استبداله بـ useSearchParams
      // يتطلب Suspense في صفحة مُولّدة كستاتيك (زيادة تعقيد بلا فائدة وظيفية).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode('signup');
    }
  }, []);

  function validate(): boolean {
    const nextErrors: { email?: string; password?: string; consent?: string; server?: string } = {};
    if (!EMAIL_PATTERN.test(email.trim())) {
      nextErrors.email = 'يرجى إدخال بريد إلكتروني صحيح — مثال: name@mail.com';
    }
    if (password.length < 8) {
      nextErrors.password = 'كلمة المرور 8 أحرف على الأقل';
    }
    if (mode === 'signup' && !consent) {
      nextErrors.consent = 'نحتاج موافقتك على معالجة بياناتك (151/2020) للمتابعة';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors((prev) => ({ ...prev, server: undefined }));
    try {
      if (mode === 'login') {
        const session = await loginUser({ email: email.trim(), password });
        setAuthSession(session);
        showToast('success', 'تم تسجيل الدخول بنجاح.');
        router.push('/chat');
        return;
      }

      // حساب جديد: عقد backend يعيد UserResponse بلا توكنات — نُسجّل دخولاً تلقائياً
      // بالبيانات نفسها للحصول على الجلسة (حل أمامي لا يعدّل عقد backend).
      await registerUser({ email: email.trim(), password });
      try {
        const session = await loginUser({ email: email.trim(), password });
        setAuthSession(session);
        showToast('success', 'تم إنشاء حسابك — أهلاً بك!');
      } catch {
        showToast('success', 'تم إنشاء حسابك — سجّل دخولك الآن.');
      }
      router.push('/chat');
    } catch (error) {
      // 409 = البريد مسجّل مسبقاً (ConflictException في backend auth.service.ts) —
      // رسالة محددة بدل رسالة «بيانات غير صحيحة» العامة المضلّلة في وضع إنشاء الحساب.
      const isConflict = error instanceof Error && error.message.includes('409');
      const message =
        mode === 'signup' && isConflict
          ? 'هذا البريد مسجّل مسبقاً — سجّل دخولك مباشرة من تبويب «تسجيل الدخول».'
          : error instanceof Error && error.message.includes('HTTP 4')
            ? 'بيانات الدخول غير صحيحة — تحقق من البريد وكلمة المرور.'
            : 'تعذّر الاتصال بالخادم — تأكد من تشغيل الخلفية وحاول مرة أخرى.';
      setErrors((prev) => ({ ...prev, server: message }));
      showToast('error', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-ui text-text-primary">
      <Header showAuth={false} />

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 items-start justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <Scale className="h-10 w-10 text-primary" aria-hidden="true" />
            <h1 className="text-h2 font-bold text-text-primary">
              {mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
            </h1>
            <p className="text-body-sm text-text-secondary">
              {mode === 'login'
                ? 'مرحباً بعودتك — سجّل للوصول لسجل أسئلتك.'
                : 'ابدأ تجربتك المجانية — لا حاجة لبطاقة دفع.'}
            </p>
          </div>

          <div className="mb-6 flex rounded-md border border-border-default p-1" role="tablist" aria-label="نوع الدخول">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => setMode('login')}
              className={`h-11 flex-1 rounded-md text-body-sm font-medium transition-colors duration-[120ms] focus-visible:outline-none ${
                mode === 'login' ? 'bg-primary-soft text-primary' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              onClick={() => setMode('signup')}
              className={`h-11 flex-1 rounded-md text-body-sm font-medium transition-colors duration-[120ms] focus-visible:outline-none ${
                mode === 'signup' ? 'bg-primary-soft text-primary' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              حساب جديد
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border-default bg-surface p-6 shadow-md" noValidate>
            <TextField
              id="email"
              type="email"
              label="البريد الإلكتروني"
              placeholder="name@mail.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={errors.email}
              autoComplete="email"
              dir="ltr"
            />
            <TextField
              id="password"
              type="password"
              label="كلمة المرور"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={errors.password}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              dir="ltr"
            />

            {mode === 'signup' ? (
              <div>
                <label className="flex items-start gap-2 text-body-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                    className="mt-1 h-4 w-4 accent-primary"
                  />
                  <span>
                    أوافق على معالجة بياناتي وفق سياسة الخصوصية وقانون حماية البيانات الشخصية 151/2020.
                  </span>
                </label>
                {errors.consent ? (
                  <p role="alert" className="mt-1.5 text-body-sm text-error">
                    {errors.consent}
                  </p>
                ) : null}
              </div>
            ) : null}

            {errors.server ? (
              <p role="alert" className="rounded-md bg-error-soft px-3 py-2 text-body-sm text-error">
                {errors.server}
              </p>
            ) : null}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              {mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push('/chat')}
                className="inline-flex min-h-[44px] items-center text-body-sm text-link underline underline-offset-4 hover:text-primary-hover focus-visible:outline-none"
              >
                متابعة كزائر (بدون حساب)
              </button>
            </div>
          </form>

          <div className="mt-4">
            <DisclaimerBanner />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
