/**
 * GuestSessionBootstrap — بدء جلسة زائر تلقائياً لتجربة كل الخدمات بلا تسجيل
 * (الاختبار قبل الإطلاق التجريبى / Soft Opening).
 *
 * المبدأ: لا نُزيل أى حماية. حين تكون الخلفية مفعِّلة وضع الزائر
 * (GET /auth/guest-config → enabled) ولا توجد جلسة، نحصل على حساب زائر مؤقت
 * معزول وتوكن عادى، فتعمل كل الشاشات (عقود، ترجمة، مذكرات، مستندات، تنزيل…)
 * كما تعمل لمستخدم مسجَّل — وتبقى فحوص الملكية سليمة.
 *
 * الموافقة (151/2020): صريحة دائماً. أول مرة: بطاقة غير حاجبة بزر «موافق وابدأ».
 * بعدها تُتذكَّر الموافقة على نفس نسخة السياسة فى هذا المتصفح (localStorage) فتبدأ
 * الجلسة تلقائياً فى التبويبات التالية.
 *
 * التحميل: بعد إنشاء الجلسة تُعاد الصفحة مرة واحدة كى تقرأ كل الشاشات الجلسة
 * (isAuthenticated تُقرأ عند التركيب). حارس منع التكرار: لا نعيد التحميل إلا بعد
 * التأكد أن الجلسة حُفظت فعلاً (وإلا لأنشأنا زائراً جديداً فى كل تحميل).
 *
 * إن كان الوضع معطّلاً (الافتراضى) أو تعذّر الاتصال: لا شىء يظهر ولا يتغير أى سلوك.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createGuestSession, fetchGuestConfig } from '@/lib/api-client';
import { clearAuthSession, getCurrentUser, isAccessTokenExpired, isAuthenticated, setAuthSession } from '@/lib/auth';
import { hasStoredGuestConsent, isGuestUser, storeGuestConsent } from '@/lib/guest';

type Phase = 'idle' | 'prompt' | 'starting' | 'error';

/** الصفحات التى لا تُعرض فيها البطاقة (المستخدم يدخل بحسابه هناك) */
const HIDDEN_PATH_PREFIXES = ['/login'];

export function GuestSessionBootstrap() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [consentVersion, setConsentVersion] = useState<string | null>(null);
  const started = useRef(false);

  async function startSession(version: string): Promise<void> {
    if (started.current) return;
    started.current = true;
    setPhase('starting');
    try {
      const session = await createGuestSession();
      setAuthSession(session);
      // حارس منع الحلقة: لا إعادة تحميل إن لم تُحفظ الجلسة (تخزين محجوب مثلاً)
      if (!isAuthenticated()) {
        started.current = false;
        setPhase('error');
        return;
      }
      storeGuestConsent(version);
      window.location.reload();
    } catch {
      started.current = false;
      setPhase('error');
    }
  }

  useEffect(() => {
    if (isAuthenticated()) {
      // جلسة زائر منتهية الصلاحية (تبويب بقى مفتوحاً أو جلسة قديمة): تُمسح ويبدأ زائر جديد تلقائياً
      // بدل رسالة "سجّل الدخول". حساب المستخدم العادى لا يُمسّ أبداً.
      if (isGuestUser(getCurrentUser()) && isAccessTokenExpired()) {
        clearAuthSession();
      } else {
        return;
      }
    }
    if (HIDDEN_PATH_PREFIXES.some((p) => window.location.pathname.startsWith(p))) return;

    let cancelled = false;
    void (async () => {
      let config;
      try {
        config = await fetchGuestConfig();
      } catch {
        return; // الخلفية غير متاحة أو الميزة غير موجودة — لا تغيير
      }
      if (cancelled || !config.enabled) return;
      setConsentVersion(config.consent_version);
      if (hasStoredGuestConsent(config.consent_version)) {
        await startSession(config.consent_version);
      } else {
        setPhase('prompt');
      }
    })();

    return () => {
      cancelled = true;
    };
    // تُنفَّذ مرة واحدة عند التركيب فقط
  }, []);

  if (phase === 'idle' || phase === 'starting' || !consentVersion) return null;

  return (
    <aside
      role="region"
      aria-label="وضع الاختبار المفتوح"
      className="fixed inset-x-3 bottom-3 z-modal mx-auto max-w-[560px] rounded-lg border border-border-default bg-surface p-4 shadow-lg"
    >
      <div className="flex items-start gap-3">
        <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="flex-1 space-y-2">
          <p className="text-body-sm font-medium text-text-primary">وضع الاختبار المفتوح</p>
          <p className="text-body-sm text-text-secondary">
            يمكنك تجربة كل الخدمات الآن بلا تسجيل، بحساب زائر مؤقت معزول عن غيرك. بالضغط على
            «موافق وابدأ» توافق على معالجة بياناتك وفق سياسة الخصوصية وقانون حماية البيانات
            الشخصية 151/2020.
          </p>
          {phase === 'error' ? (
            <p role="alert" className="text-body-sm text-error">
              تعذّر بدء جلسة الزائر. تحقق من اتصالك وأن التخزين فى المتصفح غير محجوب، ثم أعد المحاولة.
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => void startSession(consentVersion)}
            >
              موافق وابدأ
            </Button>
            <Link
              href="/login"
              className="inline-flex min-h-[44px] items-center rounded-md px-3 text-body-sm text-text-secondary hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none"
            >
              لدىّ حساب
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
