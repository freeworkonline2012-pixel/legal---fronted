import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { MemosScreen } from '@/components/memos/MemosScreen';

export const metadata: Metadata = {
  title: 'المذكرات القانونية — منصة قانونية عربية',
  description:
    'مسودة مذكرة أو تقرير قانونى مقيَّدة بالنصوص المفهرَسة: كل فقرة قانونية لها سند، ووقائعك وطلباتك تُنسخ كما كتبتها، والمستند مسودة تحتاج مراجعة محامٍ.',
};

export default function MemosPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-ui text-text-primary">
      <Header />
      <MemosScreen />
      <Footer />
      <BottomNav />
    </div>
  );
}
