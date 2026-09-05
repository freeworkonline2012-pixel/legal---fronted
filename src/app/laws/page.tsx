import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { LawsBrowser } from '@/components/laws/LawsBrowser';

export const metadata: Metadata = {
  title: 'القوانين — منصة قانونية عربية',
  description: 'تصفح القوانين المصرية الموثّقة، مع فلترة بالمجال وحالة النفاذ.',
};

export interface LawsPageProps {
  // Next.js 15+/16: searchParams فى App Router هو Promise فى مكوّنات الخادم
  searchParams: Promise<{ category?: string; country?: string }>;
}

export default async function LawsPage({ searchParams }: LawsPageProps) {
  const resolved = await searchParams;

  return (
    <div className="flex min-h-screen flex-col bg-background font-ui text-text-primary">
      <Header />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 pb-24 sm:px-8 lg:pb-8">
        <h1 className="text-h1 font-bold text-text-primary">القوانين</h1>
        <p className="mt-2 max-w-2xl text-body text-text-secondary">
          نصوص رسمية موثّقة من مصادرها — ابحث أو صفّح حسب المجال وحالة النفاذ.
          {/* القرارات واللوائح التنفيذية لهما صفحتان مستقلتان (/decisions
              و/regulations، أُضيفتا 2026-08-28) عند التصفح العام بلا مجال محدَّد.
              لكن عند الوصول بفئة محدَّدة (؟category=..، غالباً من الشريط
              الجانبى الذى يَعُدّ كل الأنواع معاً تحت كل مجال) نعرض كل الأنواع
              (قانون/قرار/لائحة) فى هذا المجال معاً، بلا قصر على kind=law —
              حتى يطابق العدّاد المعروض فعلياً ما يظهر بعد الضغط عليه. */}
        </p>
        <div className="mt-6">
          <LawsBrowser
            initialCategory={resolved.category}
            initialCountry={resolved.country}
            kindFilter={resolved.category ? undefined : ['law']}
            itemNoun={resolved.category ? 'قانوناً وقراراً ولائحة' : 'قانوناً'}
          />
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
