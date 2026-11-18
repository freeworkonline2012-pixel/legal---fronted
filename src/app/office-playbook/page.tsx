import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { OfficePlaybookScreen } from '@/components/office-playbook/OfficePlaybookScreen';

export const metadata: Metadata = {
  title: 'قواعد المكتب — منصة قانونية عربية',
  description: 'اضبط قواعد مكتبك لتدقيق العقود وصياغتها: عطّل القواعد الافتراضية، غيّر درجاتها، وأضف قواعدك الخاصة بعبارات نصية.',
};

export default function OfficePlaybookPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-ui text-text-primary">
      <Header />
      <OfficePlaybookScreen />
      <Footer />
      <BottomNav />
    </div>
  );
}
