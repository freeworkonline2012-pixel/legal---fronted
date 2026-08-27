/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // عطل حي حقيقي (2026-08-21): output:'standalone' كان مضبوطاً ثابتاً — يبني مجلداً
  // مستقلاً كاملاً لغرض Docker/الاستضافة الذاتية (انظر Dockerfile) لكنه ينتج بنية
  // مخرجات .next مختلفة تماماً عن البنية القياسية التي يتوقعها Vercel لبناء دوال
  // التشغيل الخاصة به. النتيجة الفعلية على Vercel: `next build` ينجح بالكامل (كل
  // الصفحات تُولَّد) لكن خطوة Vercel اللاحقة (`onBuildComplete`) تفشل فوراً بعدها
  // بـ `ENOENT: .next/next-server.js.nft.json` — ملف تتبّع Vercel القياسي غير موجود
  // أصلاً لأن standalone لا يُنتجه. الحل: standalone فقط عند البناء المحلي/Docker؛
  // Vercel يضبط `process.env.VERCEL` تلقائياً في كل بيئات بنائه، فنترك له مخرجاته
  // الافتراضية القياسية بدل standalone — لا تغيير على مسار Docker إطلاقاً.
  output: process.env.VERCEL ? undefined : 'standalone',
  // DEF-3 (Live Experience Sentinel round 20): مسارات بديلة يكتبها المستخدمون
  // يدوياً في المتصفح (أو تفحصها أدوات E2E) — لا توجد صفحات مستقلة بهذه الأسماء:
  // التسجيل مدمج في /login?mode=signup (تبويب «حساب جديد» + موافقة 151/2020)،
  // واللوحة الرئيسية بعد الدخول هي /chat. redirect=307 بدل 404 ليستقبل المستخدم
  // المسار الصحيح فوراً (قرار تصميمي موثق — لا صفحات مكررة بلا قيمة).
  async redirects() {
    return [
      {
        source: '/register',
        destination: '/login?mode=signup',
        permanent: false,
      },
      {
        source: '/dashboard',
        destination: '/chat',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
