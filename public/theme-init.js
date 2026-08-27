/**
 * سكربت تهيئة الوضع الليلي قبل الـ hydration — يمنع FOUC (وميض الوضع الفاتح
 * للمستخدم الذي يفضّل dark في أول رسم).
 *
 * - يقرأ التفضيل المحفوظ في localStorage تحت المفتاح 'legal-platform-theme'.
 * - إن لم يوجد تفضيل محفوظ يتبع prefers-color-scheme النظامي.
 * - يطبّق class `dark` على <html> قبل أن يرسم المتصفح أي محتوى.
 *   ThemeProvider (src/lib/theme.tsx) يقرأ الفئة نفسها عند التهيئة فيتطابق الحالان فوراً.
 *
 * 🔒 أمن (سجل أمني — جولة 29، إغلاق ملاحظة SAST الاستشارية CWE-79 في layout.tsx):
 *    هذا الملف **ثابت مكتوب يدوياً** بلا أي مدخل مستخدم أو متغير خارجي — لا يوجد
 *    مسار XSS قابل للاستغلال إطلاقاً. نُقل السكربت من حقن HTML خام داخل layout.tsx
 *    إلى ملف static في public/ يُحمَّل عبر وسم `<script src>` عادي parser-blocking
 *    في <head> — النمط المرفوض من ماسح SAST اختفى من الكود المصدر نهائياً مع بقاء
 *    التنفيذ قبل أول رسم (منع FOUC) سليماً ومُتحقَّقاً منه في HTML المولَّد.
 *
 * ملاحظة CSP للتفعيل لاحقاً: هذا الملف يُحمَّل بوصف src خارجي (لا inline) فلا
 * يتطلب unsafe-inline؛ أي تغيير مستقبلي لنمط الحقن يجب أن يراعي سياسة المحتوى.
 */
(function () {
  try {
    var key = 'legal-platform-theme';
    var stored = window.localStorage.getItem(key);
    var isDark =
      stored === 'dark' ||
      (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  } catch (e) {
    // localStorage غير متاح (وضع خصوصي صارم) — نكمل للرسم الافتراضي بلا فشل
  }
})();
