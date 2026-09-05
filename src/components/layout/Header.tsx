/**
 * مكوّن Header — الهيدر الثابت (component_states.md القسم 15).
 *
 * - ارتفاع 64px، خلفية surface، حدود سفلية 1px، sticky مع z-index 100.
 * - الشعار (أيقونة + اسم) + التنقل الرئيسي + زر الوضع الليلي + CTA.
 * - موبايل أولاً: على الشاشات الصغيرة تُخفى بعض الروابط النصية.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LogOut, Scale } from 'lucide-react';
import { ThemeToggle } from '@/lib/theme';
import { ButtonLink } from '@/components/ui/Button';
import { logoutUser } from '@/lib/api-client';
import { clearAuthSession, getCurrentUser, getRefreshToken, isAuthenticated } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';

export interface HeaderProps {
  /**
   * إظهار أزرار الدخول/التسجيل في الهيدر. افتراضياً false: الإصدار الأول (v1)
   * موجّه لعامة الجمهور بلا تسجيل دخول إلزامى — ميزات الحساب (تسجيل الدخول،
   * أسئلتي، الخطط) مؤجّلة دون حذف الصفحات نفسها. مرّر true صراحة لإعادة تفعيلها
   * فى مرحلة لاحقة.
   */
  showAuth?: boolean;
}

export function Header({ showAuth = false }: HeaderProps) {
  const { showToast } = useToast();
  const [authed, setAuthed] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // قراءة حالة الجلسة بعد التحميل (client-only — تجنّب عدم تطابق SSR hydration).
  useEffect(() => {
    // متعمّد: sessionStorage (auth.ts) متاح للعميل فقط؛ تهيئة كسولة ستقرأه أثناء
    // hydration فتكسر تطابق SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthed(isAuthenticated());
    setUserEmail(getCurrentUser()?.email ?? null);
  }, []);

  async function handleLogout() {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await logoutUser(refreshToken);
      } catch {
        // best-effort — المسح المحلي لا يعتمد على الخادم
      }
    }
    clearAuthSession();
    setAuthed(false);
    setUserEmail(null);
    showToast('success', 'تم تسجيل الخروج.');
  }

  return (
    <header className="header-surface sticky top-0 z-sticky-header border-b border-border-default">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-8">
        {/* تحديث الهوية 2026-09-05 (بطلب صريح): الاسم أصبح "شيلد" كعنوان رئيسى
            يُقرَأ أولاً (قبل الأيقونة مباشرة)، ثم أيقونة Scale نفسها بلون ذهبى
            بدل لون primary تتوسط الاسم والوصف الفرعى، ثم "منصة قانونية عربية"
            كوصف فرعى بعدها. لم يُستبدل بشعار صورة — لا يوجد ملف شعار فعلى
            مرفوع من صاحب المشروع (بُحث فى المستودعين وDownloads، راجع تقرير
            التسليم)؛ إن تم توفير شعار لاحقاً يستبدل أيقونة Scale مباشرة هنا. */}
        <Link
          href="/"
          className="flex min-h-[44px] items-center gap-2.5 rounded-md focus-visible:outline-none"
          aria-label="شيلد — منصة قانونية عربية — الرئيسية"
        >
          <span className="text-h4 font-bold text-text-primary">شيلد</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft">
            <Scale className="h-5 w-5 text-[#B8860B]" aria-hidden="true" />
          </span>
          <span className="text-body-sm text-text-secondary">منصة قانونية عربية</span>
        </Link>

        <nav aria-label="التنقل الرئيسي" className="flex items-center gap-1 sm:gap-2">
          {/* ترتيب القائمة (أُعيد ترتيبه بالكامل 2026-09-05 بطلب صريح):
              الرئيسية - القوانين - القرارات - اللوائح التنفيذية -
              الأدلة الإرشادية - تدقيق العقود - تحقق الالتزام - [تبديل الوضع] -
              تسجيل الدخول/جرّب مجاناً (أو البريد/خروج عند وجود جلسة) - اشترك.
              «اشترك» انتقل من الموضع الثانى إلى نهاية القائمة (بطلب صريح)،
              ويبقى رابطاً تسويقياً مباشراً لصفحة /pricing غير مرتبط بحالة
              تسجيل الدخول (خلافاً لأزرار تسجيل الدخول/جرّب مجاناً المقيّدة
              بـshowAuth). زر تبديل الوضع الليلى لم يُذكر صراحة فى الترتيب
              المطلوب (ليس رابط تنقل بل أداة مساعدة دائمة) فأُبقى فى موضعه
              المنطقى المعتاد — بعد آخر رابط محتوى وقبل مجموعة الحساب. */}
          <Link
            href="/chat"
            className="hidden min-h-[44px] items-center rounded-md px-3 text-body-sm text-text-secondary hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none md:inline-flex"
          >
            الرئيسية
          </Link>
          <Link
            href="/laws"
            className="hidden min-h-[44px] items-center rounded-md px-3 text-body-sm text-text-secondary hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none md:inline-flex"
          >
            القوانين
          </Link>
          <Link
            href="/decisions"
            className="hidden min-h-[44px] items-center rounded-md px-3 text-body-sm text-text-secondary hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none md:inline-flex"
          >
            القرارات
          </Link>
          <Link
            href="/regulations"
            className="hidden min-h-[44px] items-center rounded-md px-3 text-body-sm text-text-secondary hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none md:inline-flex"
          >
            اللوائح التنفيذية
          </Link>
          <Link
            href="/guidance"
            className="hidden min-h-[44px] items-center rounded-md px-3 text-body-sm text-text-secondary hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none md:inline-flex"
          >
            الأدلة الإرشادية
          </Link>
          {/* أُضيف 2026-09-05: أول واجهة أمامية لخدمة المدقق القانونى للعقود
              (Service 2) — كانت API فقط بلا أى صفحة (Phase 3+4 مؤجَّلتان).
              بخلاف كل الروابط الأخرى هنا، هذه الصفحة تتطلب تسجيل دخول إلزامياً
              فى backend (بيانات عقود عمل حقيقية) — الرابط يبقى ظاهراً دائماً
              (بلا شرط showAuth) لأن الصفحة نفسها تتولى دعوة غير المسجَّل
              لتسجيل الدخول (راجع ContractsScreen)، بدل إخفاء الرابط بالكامل. */}
          <Link
            href="/contracts"
            className="hidden min-h-[44px] items-center rounded-md px-3 text-body-sm text-text-secondary hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none md:inline-flex"
          >
            تدقيق العقود
          </Link>
          {/* أُضيف 2026-09-05: أول واجهة أمامية لخدمة الحوكمة (Service 3) —
              كانت API فقط بلا أى صفحة (Phase 3 مؤجَّلة). ⚠️ دقة الخدمة قيد
              التحقق الفعلى وقت الإضافة (راجع تعليق GovernanceScreen) — الرابط
              ظاهر عمداً بنفس شكل باقى القائمة (لا "تجريبي" فى نص الرابط نفسه)
              لأن الصفحة نفسها تحمل تنبيهاً دائماً بارزاً غير قابل للطى، وهذا
              أنسب مكان لذلك التحذير من ازدحام نص القائمة العلوية. */}
          <Link
            href="/governance"
            className="hidden min-h-[44px] items-center rounded-md px-3 text-body-sm text-text-secondary hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none md:inline-flex"
          >
            تحقق الالتزام
          </Link>
          {/* روابط «أسئلتي» و«الخطط» تتطلب تسجيل دخول — مؤجّلة عمداً خارج نطاق
              الإصدار الأول (عامة الجمهور، بلا تسجيل دخول). الصفحات نفسها لم
              تُحذف وتبقى تعمل عبر الرابط المباشر — أُزيلت من التنقل الرئيسى فقط.
              (أُعيد تأكيد هذا القرار صراحة 2026-08-28 عند إعادة تصميم القائمة —
              راجع تقرير الجلسة لتفاصيل القرار.) */}
          <ThemeToggle />
          {showAuth ? (
            authed ? (
              <div className="hidden items-center gap-2 sm:flex">
                {userEmail ? (
                  <span className="max-w-[160px] truncate text-body-sm text-text-secondary" dir="ltr">
                    {userEmail}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="inline-flex h-11 items-center gap-1 rounded-md px-3 text-body-sm font-medium text-text-secondary hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  خروج
                </button>
              </div>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <ButtonLink href="/login" variant="ghost" size="sm">
                  تسجيل الدخول
                </ButtonLink>
                <ButtonLink href="/login?mode=signup" variant="primary" size="sm">
                  جرّب مجاناً
                </ButtonLink>
              </div>
            )
          ) : null}
          <Link
            href="/pricing"
            className="hidden min-h-[44px] items-center rounded-md px-3 text-body-sm text-text-secondary hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none md:inline-flex"
          >
            اشترك
          </Link>
        </nav>
      </div>
    </header>
  );
}
