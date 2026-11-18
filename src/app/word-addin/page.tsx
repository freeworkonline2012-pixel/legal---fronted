import type { Metadata } from 'next';
import { WordAddinScreen } from '@/components/word-addin/WordAddinScreen';

export const metadata: Metadata = {
  title: 'مراجعة العقود داخل Word — منصة قانونية',
  description: 'لوحة جانبية لـ Word: دقّق العقد المفتوح وأدرج ملاحظات المراجعة تعليقات فى المستند.',
  robots: { index: false, follow: false },
};

export default function WordAddinPage() {
  return (
    <main className="min-h-screen bg-background font-ui text-text-primary">
      <WordAddinScreen />
    </main>
  );
}
