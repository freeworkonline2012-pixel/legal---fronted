import { buildManifest, safeOrigin } from '@/lib/word-addin-manifest';

/**
 * GET /word-addin/manifest.xml — مانيفست إضافة Word، يُولَّد من أصل الموقع.
 * الأصل الموثوق: NEXT_PUBLIC_SITE_URL إن ضُبط، وإلا أصل الطلب (بعد تحقق صارم فى safeOrigin).
 */
export const dynamic = 'force-dynamic';

export function GET(request: Request): Response {
  const origin = safeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ?? safeOrigin(new URL(request.url).origin);
  if (!origin) return new Response('تعذّر تحديد عنوان الموقع لتوليد المانيفست.', { status: 500 });
  return new Response(buildManifest(origin), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': 'attachment; filename="legal-contract-review.manifest.xml"',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
