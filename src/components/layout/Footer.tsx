/**
 * مكوّن Footer — تذييل الصفحة.
 *
 * - يعرض إخلاء المسؤولية دائماً (P7 — لا يُخفى في أي واجهة).
 * - روابط حقوق المستخدم وفق 151/2020 (تصدير البيانات / حذف الحساب) عند الطلب.
 */

import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner';

export interface FooterProps {
  /** عرض روابط حقوق البيانات (تُستخدم في شاشات التطبيق المعتمدة مثل أسئلتي) */
  showDataRights?: boolean;
}

export function Footer({ showDataRights = false }: FooterProps) {
  return (
    <footer className="border-t border-border-default bg-surface-muted">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 px-4 py-6 sm:px-8">
        <DisclaimerBanner />
        <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
          <p className="text-caption text-text-tertiary">
            © {new Date().getFullYear()} منصة قانونية عربية — معلومة موثّقة بالمصدر.
          </p>
          {showDataRights ? (
            <nav aria-label="حقوق البيانات" className="flex items-center gap-4">
              <a
                href="#export"
                className="text-caption text-link underline underline-offset-4 hover:text-primary-hover focus-visible:outline-none"
              >
                تصدير بياناتي (JSON)
              </a>
              <a
                href="#delete"
                className="text-caption text-link underline underline-offset-4 hover:text-primary-hover focus-visible:outline-none"
              >
                حذف حسابي نهائياً
              </a>
            </nav>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
