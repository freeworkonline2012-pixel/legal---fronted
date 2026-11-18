/**
 * PendingPaymentsPanel — للمالك (admin) فقط: طلبات مراجعة العقود التى أعلن أصحابها السداد وتنتظر تأكيدك.
 * التأكيد بعد مطابقة «مرجع السداد» مع حسابك؛ بعده يُفتح للعميل ما بعد السداد (واعتماد المراجعة البشرية شرط التنزيل النهائى).
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { ApiError, confirmContractPayment, fetchPendingPayments } from '@/lib/api-client';
import type { PendingPayment } from '@/lib/types';
import { Button } from '@/components/ui/Button';

export function PendingPaymentsPanel() {
  const [items, setItems] = useState<PendingPayment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await fetchPendingPayments());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذّر تحميل الطلبات.');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function confirm(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await confirmContractPayment(id);
      setItems((prev) => (prev ? prev.filter((p) => p.contract_id !== id) : prev));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذّر تأكيد السداد — حاول مرة أخرى.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section aria-label="طلبات بانتظار تأكيد السداد" className="mb-6 space-y-3 rounded-lg border border-border-default bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-body font-semibold text-text-primary">طلبات بانتظار تأكيد السداد</h2>
        <Button size="sm" variant="ghost" onClick={() => void load()} disabled={busyId !== null}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          تحديث
        </Button>
      </div>
      {items === null && !error ? <p role="status" className="text-body-sm text-text-secondary">جارٍ التحميل…</p> : null}
      {items !== null && items.length === 0 ? <p className="text-body-sm text-text-secondary">لا طلبات بانتظار التأكيد.</p> : null}
      {items && items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((p) => (
            <li key={p.contract_id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface-inset p-3">
              <div className="min-w-0 text-body-sm">
                <p className="truncate font-semibold text-text-primary">{p.original_filename}</p>
                <p className="text-text-secondary">
                  {p.fee_amount === null ? 'السعر غير مسجَّل' : `${p.fee_amount.toLocaleString('en-US')} جنيه`} — مرجع السداد: {p.payment_reference ?? '—'}
                </p>
              </div>
              <Button size="sm" loading={busyId === p.contract_id} disabled={busyId !== null} onClick={() => void confirm(p.contract_id)} aria-label={`تأكيد سداد ${p.original_filename}`}>
                تأكيد السداد
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p role="alert" className="text-body-sm text-error">{error}</p> : null}
    </section>
  );
}
