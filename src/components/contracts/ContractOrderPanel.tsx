/**
 * ContractOrderPanel — مسار العميل بعد تحليل عقده: نسخة أولية PDF ← موافقة ← سداد ← تسليم Word/PDF.
 *
 * كل منطق الإتاحة والقفل من الخادم (GET /exports/contracts/{id}/order)؛ هذه الشاشة تعرض المرحلة فقط.
 * المالك/admin لا يراها (بلا مقابل — يستعمل أزرار التنزيل المباشرة).
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock, FileDown, Lock, RefreshCw } from 'lucide-react';
import { ApiError, approveContractOrder, downloadContractPreliminary, downloadExport, fetchContractOrder, submitContractPayment } from '@/lib/api-client';
import type { ContractOrder } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';

export interface ContractOrderPanelProps {
  contractId: string;
  /** يُستدعى حين تصير المرحلة «مسدَّد» أول مرة كى تُعاد جلب النتيجة كاملة (تُفتح التفاصيل) */
  onPaid?: () => void;
}

const STAGES: Array<{ id: ContractOrder['stage']; label: string }> = [
  { id: 'preview', label: 'نسخة أولية' },
  { id: 'approved', label: 'موافقة' },
  { id: 'payment_submitted', label: 'سداد' },
  { id: 'paid', label: 'تسليم' },
];

function priceLabel(order: ContractOrder): string {
  return order.fee_amount === null ? 'غير محدد' : `${order.fee_amount.toLocaleString('en-US')} جنيه مصرى`;
}

export function ContractOrderPanel({ contractId, onPaid }: ContractOrderPanelProps) {
  const [order, setOrder] = useState<ContractOrder | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [reference, setReference] = useState('');

  // يُنبَّه onPaid مرة واحدة فقط عند الانتقال إلى «مسدَّد» (لا عند أول تحميل لطلب مسدَّد سلفاً: العقد وقتها مفتوح أصلاً)
  const stageRef = useRef<ContractOrder['stage'] | null>(null);

  const apply = useCallback(
    (next: ContractOrder) => {
      const prev = stageRef.current;
      stageRef.current = next.stage;
      setOrder(next);
      if (prev !== null && prev !== 'paid' && next.stage === 'paid') onPaid?.();
    },
    [onPaid],
  );

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      apply(await fetchContractOrder(contractId));
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'تعذّر تحميل حالة الطلب.');
    }
  }, [contractId, apply]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذّر تنفيذ الطلب — حاول مرة أخرى.');
    } finally {
      setBusy(null);
    }
  }

  if (loadError) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-border-default bg-surface p-4">
        <p className="text-body-sm text-text-primary">{loadError}</p>
        <Button size="sm" variant="secondary" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          إعادة المحاولة
        </Button>
      </div>
    );
  }
  if (!order) {
    return (
      <p role="status" className="text-body-sm text-text-secondary">
        جارٍ تحميل حالة الطلب…
      </p>
    );
  }
  // المالك/admin: بلا مراحل (الأزرار المباشرة فى الشاشة)
  if (order.free_access) return null;

  const stageIndex = STAGES.findIndex((s) => s.id === order.stage);

  return (
    <section aria-label="طلب مراجعة العقد" className="space-y-4 rounded-lg border border-border-default bg-surface p-4">
      <ol aria-label="مراحل الطلب" className="flex flex-wrap items-center gap-2 text-caption">
        {STAGES.map((s, i) => (
          <li
            key={s.id}
            aria-current={i === stageIndex ? 'step' : undefined}
            className={`rounded-full px-3 py-1 ${i < stageIndex ? 'bg-primary-soft text-primary' : i === stageIndex ? 'bg-primary text-text-on-primary font-semibold' : 'bg-surface-muted text-text-tertiary'}`}
          >
            {i + 1}. {s.label}
          </li>
        ))}
      </ol>

      {order.stage === 'preview' ? (
        <div className="space-y-3">
          <p className="text-body-sm text-text-secondary">
            هذه <strong>نسخة أولية</strong> من مراجعة عقدك (حالة كل بند وعناوين الملاحظات). التفسير والمواد القانونية والصياغات المقترحة
            والتنزيل النهائى بصيغة Word أو PDF تتاح بعد موافقتك وسداد مقابل الخدمة.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              loading={busy === 'preliminary'}
              disabled={busy !== null || !order.can_download_preliminary}
              onClick={() => void run('preliminary', () => downloadContractPreliminary(contractId))}
            >
              <FileDown className="h-4 w-4" aria-hidden="true" />
              تنزيل النسخة الأولية PDF
            </Button>
          </div>
          <div className="space-y-2 border-t border-border-default pt-3">
            <p className="text-body-sm text-text-primary">
              مقابل الخدمة: <strong>{priceLabel(order)}</strong>
            </p>
            <label className="flex items-start gap-2 text-body-sm text-text-primary">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" disabled={order.fee_amount === null} />
              <span>اطّلعت على النسخة الأولية وأوافق على المتابعة وسداد مقابل الخدمة.</span>
            </label>
            <Button
              size="sm"
              loading={busy === 'approve'}
              disabled={busy !== null || !agreed || order.fee_amount === null}
              onClick={() => void run('approve', async () => apply(await approveContractOrder(contractId)))}
            >
              أوافق وأتابع للسداد
            </Button>
            {order.fee_amount === null ? (
              <p role="status" className="text-caption text-text-secondary">
                لم يُحدَّد سعر الخدمة بعد — تواصل مع إدارة المنصة.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {order.stage === 'approved' || order.stage === 'payment_submitted' ? (
        <div className="space-y-3">
          <p className="text-body-sm text-text-primary">
            مقابل الخدمة: <strong>{priceLabel(order)}</strong>
          </p>
          {order.payment_instructions ? (
            <div className="whitespace-pre-line rounded-md bg-surface-inset p-3 text-body-sm text-text-primary" aria-label="تعليمات السداد">
              {order.payment_instructions}
            </div>
          ) : (
            <p className="text-body-sm text-text-secondary">ستصلك تعليمات السداد من إدارة المنصة.</p>
          )}
          {order.stage === 'payment_submitted' ? (
            <p role="status" className="flex items-center gap-2 text-body-sm text-text-primary">
              <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
              أعلنتَ السداد (المرجع: {order.payment_reference}) — بانتظار تأكيد الإدارة؛ سيتاح التنزيل فور التأكيد.
            </p>
          ) : null}
          <div className="max-w-sm space-y-2">
            <TextField
              label={order.stage === 'payment_submitted' ? 'تصحيح مرجع السداد (اختيارى)' : 'مرجع السداد (رقم العملية أو التحويل)'}
              value={reference}
              maxLength={100}
              onChange={(e) => setReference(e.target.value)}
              helper="يطابقه المالك مع حسابه لتأكيد السداد."
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                loading={busy === 'payment'}
                disabled={busy !== null || reference.trim().length < 3}
                onClick={() => void run('payment', async () => { apply(await submitContractPayment(contractId, reference.trim())); setReference(''); })}
              >
                {order.stage === 'payment_submitted' ? 'تحديث المرجع' : 'تم السداد'}
              </Button>
              <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => void load()}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                تحديث الحالة
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {order.stage === 'paid' ? (
        <div className="space-y-3">
          <p role="status" className="flex items-center gap-2 text-body-sm text-text-primary">
            <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
            تم تأكيد السداد — شكراً لك.
          </p>
          {order.awaiting_human_review ? (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-body-sm text-text-secondary">
                <Lock className="h-4 w-4" aria-hidden="true" />
                عقدك قيد المراجعة البشرية، وسيتاح التنزيل فور اعتماده.
              </p>
              <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => void load()}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                تحديث الحالة
              </Button>
            </div>
          ) : order.can_download_final ? (
            <div className="space-y-2">
              <p className="text-body-sm text-text-secondary">
                اختر الصيغة: <strong>Word</strong> هو العقد بتعديلات متتبَّعة وتعليقات المراجعة (لتضيف بياناتك الأساسية وتقبل التعديلات أو ترفضها)،
                و<strong>PDF</strong> هو تقرير المراجعة (نسخة العميل).
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="secondary" loading={busy === 'tracked'} disabled={busy !== null} onClick={() => void run('tracked', () => downloadExport('contracts', contractId, 'tracked'))}>
                  <FileDown className="h-4 w-4" aria-hidden="true" />
                  تنزيل Word (العقد المراجَع)
                </Button>
                <Button size="sm" variant="secondary" loading={busy === 'pdf'} disabled={busy !== null} onClick={() => void run('pdf', () => downloadExport('contracts', contractId, 'pdf', 'client'))}>
                  <FileDown className="h-4 w-4" aria-hidden="true" />
                  تنزيل PDF (تقرير المراجعة)
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}
    </section>
  );
}
