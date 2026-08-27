/**
 * ErrorBoundary — حاجز أخطاء العرض (Render Error Boundary).
 *
 * الهدف: منع «الشاشة البيضاء» عند أي خطأ وقت العرض (Render Phase) — وهو أسوأ
 * تجربة ممكنة في جلسة متصفح حقيقية (Live Experience Sentinel).
 *
 * - يلتقط أي استثناء يرميه أي مكوّن فرعي أثناء العرض (وليس أثناء الأحداث/الطلبات —
 *   تلك تُعالَج بحالات الخطأ المحلية لكل شاشة).
 * - يعرض واجهة خطأ عربية RTL واضحة: رسالة + زر «إعادة تحميل الصفحة».
 * - يسمح بـ onReset لتجربة استعادة بدون إعادة تحميل كاملة (يُستخدم اختيارياً).
 * - زر إعادة التحميل يستدعي window.location.reload() — أي أن المستخدم لا يبقى
 *   أبداً في شاشة ميتة (لا طريق مسدود — قاعدة UI الحاكمة).
 *
 * ملاحظة تقنية: React يتطلب مكوّن Class لحاجز الأخطاء (لا يوجد بديل Hooks بعد).
 */

'use client';

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** استدعاء اختياري يُنفَّذ عند الضغط على «إعادة المحاولة» (بدل إعادة التحميل الكاملة) */
  onReset?: () => void;
  /** عنوان مخصص (افتراضياً عربي مناسب) */
  title?: string;
  /** نص مخصص أسفل العنوان */
  description?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    // يُستدعى بعد أي خطأ عرض — نرفع العلامة لنعرض واجهة الخطأ بدل الشاشة البيضاء
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // تسجيل الخطأ في وحدة التحكم ليمكن تتبعه — لا نُسقط التطبيق
    console.error('[ErrorBoundary] خطأ وقت العرض:', error, info.componentStack);
  }

  private handleReset = (): void => {
    if (this.props.onReset) {
      this.props.onReset();
      this.setState({ hasError: false });
      return;
    }
    // إعادة تحميل كاملة — الخيار الافتراضي الأكثر أماناً
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main
        role="alert"
        className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 py-16 text-center"
      >
        <AlertTriangle className="h-12 w-12 text-warning" aria-hidden="true" />
        <h1 className="text-h2 font-bold text-text-primary">
          {this.props.title ?? 'حدث خطأ غير متوقع'}
        </h1>
        <p className="max-w-md text-body text-text-secondary">
          {this.props.description ??
            'واجهنا مشكلة أثناء عرض هذه الصفحة — هذا لا يعني فقدان بياناتك. أعد تحميل الصفحة للمتابعة، وإن تكرر الخطأ تواصل معنا.'}
        </p>
        <button
          type="button"
          onClick={this.handleReset}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-primary px-5 text-body-sm font-semibold text-text-on-primary transition-colors duration-[120ms] hover:bg-primary-hover focus-visible:outline-none"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          إعادة تحميل الصفحة
        </button>
      </main>
    );
  }
}
