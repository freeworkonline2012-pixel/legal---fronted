import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { ArticleDetailScreen } from '@/components/laws/ArticleDetailScreen';

export const metadata: Metadata = {
  title: 'تفاصيل المادة — منصة قانونية عربية',
};

export interface ArticlePageProps {
  params: Promise<{ id: string; articleNo: string }>;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id, articleNo } = await params;
  const parsedArticleNo = Number(articleNo);

  return (
    <div className="flex min-h-screen flex-col bg-background font-ui text-text-primary">
      <Header />
      <main className="mx-auto w-full max-w-[900px] flex-1 px-4 py-8 pb-24 sm:px-8 lg:pb-8">
        {Number.isFinite(parsedArticleNo) ? (
          <ArticleDetailScreen lawId={id} articleNo={parsedArticleNo} />
        ) : (
          <p className="text-body text-error">رقم مادة غير صالح.</p>
        )}
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
