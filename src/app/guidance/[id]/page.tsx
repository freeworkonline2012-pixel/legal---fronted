import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { GuidanceDetailScreen } from '@/components/guidance/GuidanceDetailScreen';

export const metadata: Metadata = {
  title: 'تفاصيل الدليل الإرشادى — منصة قانونية عربية',
};

export interface GuidancePageProps {
  params: Promise<{ id: string }>;
}

export default async function GuidanceDetailPage({ params }: GuidancePageProps) {
  const { id } = await params;

  return (
    <div className="flex min-h-screen flex-col bg-background font-ui text-text-primary">
      <Header />
      <main className="mx-auto w-full max-w-[900px] flex-1 px-4 py-8 pb-24 sm:px-8 lg:pb-8">
        <GuidanceDetailScreen id={id} />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
