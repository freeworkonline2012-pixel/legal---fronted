import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { ReferenceDetailScreen } from '@/components/references/ReferenceDetailScreen';

export const metadata: Metadata = {
  title: 'مرجع قانونى — منصة قانونية عربية',
};

export interface ReferencePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ s?: string }>;
}

export default async function ReferenceDetailPage({ params, searchParams }: ReferencePageProps) {
  const { id } = await params;
  const { s } = await searchParams;
  const parsed = s !== undefined && /^\d{1,9}$/.test(s) ? Number(s) : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-background font-ui text-text-primary">
      <Header />
      <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-8 pb-24 sm:px-8 lg:pb-8">
        <ReferenceDetailScreen id={id} initialSeq={parsed} />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
