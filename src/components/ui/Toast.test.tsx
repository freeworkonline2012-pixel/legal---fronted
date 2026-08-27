/**
 * اختبارات نظام Toast (component_states.md القسم 11).
 *
 * يغطي:
 * - إشعار النجاح/المعلومة: role=status.
 * - إشعار الخطأ: role=alert + لا يُغلق تلقائياً (يبقى حتى إغلاق يدوي — إمكانية وصول).
 * - الإغلاق اليدوي عبر زر ✕.
 * - الاختفاء التلقائي لإشعار النجاح بعد 4 ثوانٍ.
 */

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from './Toast';
import type { ToastKind } from '@/lib/types';

function Trigger({ kind, message }: { kind: ToastKind; message: string }) {
  const { showToast } = useToast();
  return (
    <button type="button" onClick={() => showToast(kind, message)}>
      إظهار
    </button>
  );
}

function renderToast(kind: ToastKind, message: string) {
  return render(
    <ToastProvider>
      <Trigger kind={kind} message={message} />
    </ToastProvider>,
  );
}

describe('Toast', () => {
  it('يعرض إشعار نجاح بدور status', async () => {
    const user = userEvent.setup();
    renderToast('success', 'تم الحفظ بنجاح');
    await user.click(screen.getByRole('button', { name: 'إظهار' }));
    expect(screen.getByRole('status')).toHaveTextContent('تم الحفظ بنجاح');
  });

  it('يعرض إشعار خطأ بدور alert', async () => {
    const user = userEvent.setup();
    renderToast('error', 'تعذّر الاتصال');
    await user.click(screen.getByRole('button', { name: 'إظهار' }));
    expect(screen.getByRole('alert')).toHaveTextContent('تعذّر الاتصال');
  });

  it('لا يُغلق إشعار الخطأ تلقائياً', async () => {
    jest.useFakeTimers();
    try {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderToast('error', 'خطأ دائم');
      await user.click(screen.getByRole('button', { name: 'إظهار' }));
      act(() => {
        jest.advanceTimersByTime(10_000);
      });
      expect(screen.getByText('خطأ دائم')).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it('يغلق الإشعار عند زر الإغلاق', async () => {
    const user = userEvent.setup();
    renderToast('info', 'معلومة سريعة');
    await user.click(screen.getByRole('button', { name: 'إظهار' }));
    await user.click(screen.getByRole('button', { name: 'إغلاق الإشعار' }));
    expect(screen.queryByText('معلومة سريعة')).not.toBeInTheDocument();
  });

  it('يختفي إشعار النجاح تلقائياً بعد 4 ثوانٍ', async () => {
    jest.useFakeTimers();
    try {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderToast('success', 'سيختفي قريباً');
      await user.click(screen.getByRole('button', { name: 'إظهار' }));
      expect(screen.getByText('سيختفي قريباً')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(4000);
      });
      expect(screen.queryByText('سيختفي قريباً')).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });
});
