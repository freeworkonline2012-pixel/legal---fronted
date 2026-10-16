import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { ReferencesBrowser } from '@/components/references/ReferencesBrowser';

export const metadata: Metadata = {
  title: 'المراجع القانونية — منصة قانونية عربية',
  description: 'كتب وشروح فقه وقضاء للاطلاع والبحث، منفصلة عن النصوص التشريعية الرسمية.',
};

export interface ReferencesPageProps {
  // Next.js 15+/16: searchParams فى App Router هو Promise فى مكوّنات الخادم
  searchParams: Promise<{ country?: string }>;
}

export default async function ReferencesPage({ searchParams }: ReferencesPageProps) {
  const resolved = await searchParams;

  return (
    <div className="flex min-h-screen flex-col bg-background font-ui text-text-primary">
      <Header />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 pb-24 sm:px-8 lg:pb-8">
        <h1 className="text-h1 font-bold text-text-primary">المراجع القانونية</h1>
        <p className="mt-2 max-w-2xl text-body text-text-secondary">
          كتب وشروح فقه وقضاء للاطلاع والبحث. هى آراء مؤلفيها وليست نصوصاً تشريعية رسمية، ولا تعتمد عليها
          إجابات المنصة.
        </p>
        <div className="mt-6">
          <ReferencesBrowser initialCountry={resolved.country} />
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
