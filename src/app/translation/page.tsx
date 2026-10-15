import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { TranslationScreen } from '@/components/translation/TranslationScreen';

export const metadata: Metadata = {
  title: 'الترجمة القانونية للعقود — منصة قانونية عربية',
  description:
    'ترجمة قانونية للعقود من العربية إلى الإنجليزية والعكس: فحص دقيق للغة العقد، مصطلحات موحّدة، أرقام ومبالغ مطابقة للأصل، وتنزيل Word أو PDF — مسودة ترجمة تحتاج مراجعة.',
};

export default function TranslationPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-ui text-text-primary">
      <Header />
      <TranslationScreen />
      <Footer />
      <BottomNav />
    </div>
  );
}
