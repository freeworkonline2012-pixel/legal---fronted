import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { GovernanceScreen } from '@/components/governance/GovernanceScreen';

export const metadata: Metadata = {
  title: 'تحقق من الالتزام — منصة قانونية عربية',
  description:
    'تحقق من مدى مطابقة إجراء أو قرار لقواعد الحوكمة والالتزام ومكافحة غسل الأموال المفهرَسة — ميزة تجريبية قيد التحقق من الدقة.',
};

export default function GovernancePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-ui text-text-primary">
      <Header />
      <GovernanceScreen />
      <Footer />
      <BottomNav />
    </div>
  );
}
