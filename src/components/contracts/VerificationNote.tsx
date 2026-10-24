/**
 * وسم التحقق المستقل: مدقق ثانٍ بتعليمات معاكسة يراجع ملاحظة صدرت عن النموذج. «غير مؤكدة» لا تعنى أن الملاحظة خاطئة؛ تعنى أن المدقق اعترض
 * (باقتباس موثَّق من النص) أو لم يستطع الجزم، فيلزم نظر محامٍ. الملاحظة لا تُحذف ولا تُخفَّض آلياً.
 */
import { BadgeCheck, ShieldQuestion } from 'lucide-react';
import type { VerificationResult } from '@/lib/types';

export function VerificationNote({ verification }: { verification: VerificationResult | null | undefined }) {
  if (!verification) return null;
  const confirmed = verification.status === 'confirmed';
  return (
    <div
      role="note"
      aria-label={confirmed ? 'اجتازت التحقق المستقل' : 'غير مؤكدة — تحتاج مراجعة بشرية'}
      className={`mt-3 flex items-start gap-2 rounded-md px-3 py-2 text-body-sm ${confirmed ? 'bg-surface-muted text-text-secondary' : 'border border-warning bg-warning-soft text-text-secondary'}`}
    >
      {confirmed ? (
        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" />
      ) : (
        <ShieldQuestion className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
      )}
      <div>
        <p className="font-semibold text-text-primary">
          {confirmed ? 'اجتازت التحقق المستقل' : 'غير مؤكدة — تحتاج مراجعة بشرية'}
        </p>
        <p>{verification.reason}</p>
        {verification.quote ? (
          <p className="mt-1">
            <q className="legal-text text-text-primary">{verification.quote}</q>
          </p>
        ) : null}
      </div>
    </div>
  );
}
