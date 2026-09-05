import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { GuidanceBrowser } from '@/components/guidance/GuidanceBrowser';

export const metadata: Metadata = {
  title: 'الأدلة الإرشادية — منصة قانونية عربية',
  description: 'منشورات وأدلة إرشادية رسمية غير مرقّمة (تعاميم، إجراءات تنفيذية) موثّقة بالمصدر.',
};

export default function GuidancePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-ui text-text-primary">
      <Header />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 pb-24 sm:px-8 lg:pb-8">
        <h1 className="text-h1 font-bold text-text-primary">الأدلة الإرشادية</h1>
        <p className="mt-2 max-w-2xl text-body text-text-secondary">
          منشورات رسمية غير مرقّمة (تعاميم وإجراءات تنفيذية) من جهات الرقابة — منفصلة عن القوانين
          والقرارات المرقّمة رسمياً.
        </p>
        <div className="mt-6">
          <GuidanceBrowser />
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
