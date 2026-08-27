import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { IBM_Plex_Sans_Arabic, Noto_Naskh_Arabic } from 'next/font/google';
import { ThemeProvider } from '@/lib/theme';
import { ToastProvider } from '@/components/ui/Toast';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import './globals.css';

/**
 * الخطّان الوحيدان في النظام (قاعدة design_system.md: 2-3 خطوط كحد أقصى):
 * - IBM Plex Sans Arabic → واجهة النظام (--font-ui).
 * - Noto Naskh Arabic → النص الحرفي للمواد القانونية فقط (--font-legal).
 * ⚠️ next/font يتطلب شبكة عند البناء؛ إن غاب الاتصال تُستخدم البدائل في
 * globals.css (Tajawal/Segoe UI/Tahoma) تلقائياً — راجع implementation_notes.md.
 */

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ui',
  display: 'swap',
});

const notoNaskhArabic = Noto_Naskh_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-legal',
  display: 'swap',
});

/**
 * سكربت تهيئة الوضع الليلي قبل الـ hydration (يمنع FOUC — وميض الوضع الفاتح
 * للمستخدم الذي يفضّل dark في أول رسم). يقرأ التفضيل المحفوظ ثم النظامي ويطبّق
 * class `dark` على <html> قبل أن يرسم المتصفح أي محتوى. ThemeProvider
 * (src/lib/theme.tsx) يقرأ الفئة نفسها عند التهيئة فيتطابق الحالان فوراً.
 *
 * 🔒 تحليل أمني (سجل أمني — جولة 29، إغلاق ملاحظة SAST الاستشارية CWE-79):
 *    نُقل السكربت من حقن HTML خام داخل هذا الملف إلى ملف static
 *    `public/theme-init.js` يُحمَّل عبر وسم `<script src>` عادي parser-blocking
 *    بلا async/defer — المتصفح ينفّذه فور جلب الملف قبل رسم <body> (يبقى منع
 *    FOUC سليماً ومُتحقَّقاً منه في HTML المولَّد). المحتوى ثابت مكتوب يدوياً
 *    بلا أي مدخل مستخدم أو متغير خارجي — لا يوجد مسار XSS، والنمط المرفوض
 *    اختفى من الكود المصدر نهائياً. جرى تقييم next/script (beforeInteractive)
 *    وتبيّن أنه لا يضمن التنفيذ قبل أول رسم في Next 16 (يُدرج عبر
 *    self.__next_s بعد التفاعلية) — لذلك اختير الوسم العادي.
 *    ⚠️ ملاحظة CSP: أي سكربت inline مستقبلي يتطلب 'unsafe-inline' عند تفعيل
 *    سياسة محتوى صارمة؛ هذا الملف خارجي (src) فلا يتأثر — انظر theme-init.js.
 */

export const metadata: Metadata = {
  title: 'منصة قانونية عربية — معلومة قانونية موثّقة بالمصدر',
  description:
    'مساعد قانوني ذكي يجيب حصراً من نصوص قانونية مصرية موثّقة مع استشهاد كامل (رقم القانون والمادة) ورفض صريح عند غياب نص كافٍ.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${ibmPlexSansArabic.variable} ${notoNaskhArabic.variable}`}
    >
      <head>
        {/* تهيئة الوضع الليلي قبل أول رسم (يمنع FOUC). وسم عادي بلا async/defer:
            parser-blocking — المتصفح يجلب الملف وينفّذه قبل رسم <body>.
            المحتوى من public/theme-init.js — ثابت بلا مدخل مستخدم (أمن: لا XSS).
            (تقييم next/script beforeInteractive: لا يضمن التنفيذ قبل أول رسم في
            Next 16 — يُدرج عبر self.__next_s — لذلك اختير الوسم العادي.
            استثناء no-sync-scripts متعمّد وموثّق: السكربت ~600 بايت من نفس الأصل
            public/ ويجب أن ينفَّذ قبل أول رسم لمنع FOUC — البديلان (beforeInteractive
            أو inline عبر حقن HTML خام) أسوأ أداءً أو مرفوض أمنياً.) */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/theme-init.js"></script>
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <ErrorBoundary>{children}</ErrorBoundary>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
