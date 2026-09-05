import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { LawsBrowser } from '@/components/laws/LawsBrowser';
import { DECISION_KINDS } from '@/lib/law-kind';

export const metadata: Metadata = {
  title: 'القرارات — منصة قانونية عربية',
  description:
    'تصفح القرارات والتعاميم الرسمية الموثّقة (قرارات رئيس مجلس الوزراء، القرارات الوزارية، وقرارات مجالس إدارة الهيئات)، مع فلترة بالمجال وحالة النفاذ.',
};

export interface DecisionsPageProps {
  // Next.js 15+/16: searchParams فى App Router هو Promise فى مكوّنات الخادم
  searchParams: Promise<{ category?: string; country?: string }>;
}

export default async function DecisionsPage({ searchParams }: DecisionsPageProps) {
  const resolved = await searchParams;

  return (
    <div className="flex min-h-screen flex-col bg-background font-ui text-text-primary">
      <Header />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 pb-24 sm:px-8 lg:pb-8">
        <h1 className="text-h1 font-bold text-text-primary">القرارات</h1>
        <p className="mt-2 max-w-2xl text-body text-text-secondary">
          قرارات رئيس مجلس الوزراء والقرارات الوزارية وقرارات مجالس إدارة
          الهيئات، موثّقة من مصادرها الرسمية — ابحث أو صفّح حسب المجال وحالة
          النفاذ.
        </p>
        <div className="mt-6">
          <LawsBrowser
            initialCategory={resolved.category}
            initialCountry={resolved.country}
            kindFilter={DECISION_KINDS}
            itemNoun="قراراً"
          />
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
