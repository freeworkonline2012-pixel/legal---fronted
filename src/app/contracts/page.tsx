import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { ContractsScreen } from '@/components/contracts/ContractsScreen';

export const metadata: Metadata = {
  title: 'المدقق القانونى للعقود — منصة قانونية عربية',
  description:
    'ارفع عقداً (PDF أو DOCX) لاستخراج بنوده وتقييمها الأولى مقابل النصوص القانونية المصرية المفهرَسة — ميزة جديدة (Phase 1+2 الأساسية).',
};

export default function ContractsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-ui text-text-primary">
      <Header showAuth />
      <ContractsScreen />
      <Footer />
      <BottomNav />
    </div>
  );
}
