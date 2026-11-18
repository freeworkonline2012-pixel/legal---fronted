import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { ContractDraftingScreen } from '@/components/contract-drafting/ContractDraftingScreen';

export const metadata: Metadata = {
  title: 'صياغة العقود — منصة قانونية عربية',
  description: 'صياغة عقد خدمات أو إيجار أو اتفاقية سرية من قوالب محكَّمة وإجاباتك، مع فحص جودة آلى وتنزيل Word/PDF — مسودة تحتاج مراجعة محامٍ.',
};

export default function ContractDraftingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-ui text-text-primary">
      <Header />
      <ContractDraftingScreen />
      <Footer />
      <BottomNav />
    </div>
  );
}
