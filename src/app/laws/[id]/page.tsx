import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { LawDetailScreen } from '@/components/laws/LawDetailScreen';

export const metadata: Metadata = {
  title: 'تفاصيل القانون — منصة قانونية عربية',
};

export interface LawPageProps {
  params: Promise<{ id: string }>;
}

export default async function LawPage({ params }: LawPageProps) {
  const { id } = await params;

  return (
    <div className="flex min-h-screen flex-col bg-background font-ui text-text-primary">
      <Header showAuth={false} />
      <main className="mx-auto w-full max-w-[900px] flex-1 px-4 py-8 pb-24 sm:px-8 lg:pb-8">
        <LawDetailScreen lawId={id} />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
