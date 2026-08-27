/**
 * مكوّن RefusalCard — حالة الرفض / الثقة المنخفضة (S-05 في wireframes — P3).
 *
 * «الرفض فرصة ثقة، لا فشل» — لا طريق مسدود أبداً:
 * - رسالة رفض صادقة (لم نجد نصاً كافياً — لن نخمّن).
 * - ثلاث خطوات تالية واضحة: إعادة صياغة / تحويل لمحامٍ بشري / سؤال في مجال آخر.
 */

'use client';

import { FileQuestion, RefreshCw, Scale, ShieldX } from 'lucide-react';
import type { QuestionAnswerResponse } from '@/lib/types';
import { getConfidenceKey } from '@/lib/normalize';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { Button } from '@/components/ui/Button';

export interface RefusalCardProps {
  answer: QuestionAnswerResponse;
  onRephrase?: () => void;
  onAskHuman?: () => void;
  onAskAnotherDomain?: () => void;
}

export function RefusalCard({ answer, onRephrase, onAskHuman, onAskAnotherDomain }: RefusalCardProps) {
  const level = getConfidenceKey(answer.confidence);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ConfidenceBadge level={level} />
      </div>

      <div className="rounded-lg border border-border-default bg-surface p-5">
        <div className="flex items-start gap-3">
          <ShieldX className="mt-1 h-6 w-6 shrink-0 text-warning" aria-hidden="true" />
          <div>
            <p className="text-body-lg text-text-primary">{answer.answer}</p>
            <p className="mt-2 text-body-sm text-text-secondary">
              هذا الموقف خارج نطاق المجالات المغطاة حالياً (عمل/إيجارات/أحوال شخصية/مرور/حماية مستهلك)
              أو لا يوجد نص قانوني موثّق كافٍ لدينا — لذلك نفضّل عدم التخمين.
            </p>
          </div>
        </div>
      </div>

      <div aria-label="خطوات تالية" className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onRephrase}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          أعد صياغة السؤال
        </Button>
        <Button variant="secondary" onClick={onAskHuman}>
          <Scale className="h-4 w-4" aria-hidden="true" />
          حوّل لمحامٍ بشري
        </Button>
        <Button variant="ghost" onClick={onAskAnotherDomain}>
          <FileQuestion className="h-4 w-4" aria-hidden="true" />
          اسأل في مجال آخر
        </Button>
      </div>
    </div>
  );
}
