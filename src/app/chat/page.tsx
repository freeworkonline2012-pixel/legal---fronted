import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { ChatScreen } from '@/components/chat/ChatScreen';

export const metadata: Metadata = {
  title: 'الأسئلة — منصة قانونية عربية',
  description: 'اطرح سؤالك القانوني واحصل على إجابة موثّقة بالمصدر.',
};

export interface ChatPageProps {
  // Next.js 15+/16: searchParams فى مكوّنات الخادم أصبح Promise — كان هذا الحقل
  // نوعاً متزامناً خاطئاً هنا (عيب سابق غير مكتشف: initialQuestion من ?q= فى رابط
  // صفحة الهبوط لم يكن يصل فعلياً لأن searchParams كائن Promise غير مفكوك).
  searchParams: Promise<{ q?: string }>;
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const resolved = await searchParams;
  const initialQuestion = typeof resolved.q === 'string' ? resolved.q : '';

  return (
    <div className="min-h-screen bg-background font-ui text-text-primary">
      <Header />
      <ChatScreen initialQuestion={initialQuestion} />
      <BottomNav />
    </div>
  );
}
