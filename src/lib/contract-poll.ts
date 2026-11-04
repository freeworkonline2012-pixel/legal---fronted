import type { ContractResponse } from '@/lib/types';

/**
 * متابعة تحليل عقد يجرى فى الخلفية: يستعلم دورياً حتى تنتهى الحالة (processed / extraction_failed).
 * - أخطاء الشبكة العابرة تُحتمل (تحليل العقد قد يطول دقائق وانقطاع لحظى لا يعنى فشله)، أما 401/403/404 فنهائية.
 * - سقف زمنى كلى حتى لا يدور المستخدم إلى الأبد.
 * ملف نقى: الاستعلام والنوم والإلغاء كلها تُمرَّر، فيُختبر بلا شبكة ولا مؤقتات حقيقية.
 */
export const POLL_INTERVAL_MS = 3000;
export const POLL_MAX_MS = 45 * 60_000;
export const POLL_MAX_CONSECUTIVE_ERRORS = 6;

export class PollTimeoutError extends Error {
  constructor() {
    super('استغرق التحليل وقتاً أطول من المعتاد — افتح العقد من السجل بعد قليل أو أعد المحاولة.');
    this.name = 'PollTimeoutError';
  }
}

export function isRunning(c: Pick<ContractResponse, 'status'>): boolean {
  return c.status === 'uploaded' || c.status === 'processing';
}

export interface PollDeps {
  fetchContract: (id: string) => Promise<ContractResponse>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  /** يُستدعى مع كل حالة وصلت (بما فيها الأولى) لعرض التقدم */
  onUpdate?: (c: ContractResponse) => void;
  /** إلغاء المتابعة (مثلاً عند مغادرة الصفحة): يُرمى AbortError */
  isCancelled?: () => boolean;
  /** هل الخطأ نهائى فلا فائدة من إعادة الاستعلام (مثلاً 401/403/404) */
  isFatal?: (err: unknown) => boolean;
}

export async function waitForContract(first: ContractResponse, deps: PollDeps): Promise<ContractResponse> {
  const started = deps.now();
  let current = first;
  let errors = 0;
  deps.onUpdate?.(current);
  while (isRunning(current)) {
    if (deps.isCancelled?.()) throw Object.assign(new Error('cancelled'), { name: 'AbortError' });
    if (deps.now() - started > POLL_MAX_MS) throw new PollTimeoutError();
    await deps.sleep(POLL_INTERVAL_MS);
    if (deps.isCancelled?.()) throw Object.assign(new Error('cancelled'), { name: 'AbortError' });
    try {
      current = await deps.fetchContract(first.id);
      errors = 0;
      deps.onUpdate?.(current);
    } catch (err) {
      if (deps.isFatal?.(err)) throw err;
      errors++;
      if (errors >= POLL_MAX_CONSECUTIVE_ERRORS) throw err;
    }
  }
  return current;
}

/** نص تقدم قصير: «تقييم البنود (4 من 12)» أو المرحلة وحدها */
export function describeProgress(p: ContractResponse['processing']): string | null {
  if (!p) return null;
  return p.total > 0 ? `${p.label} (${p.done} من ${p.total})` : p.label;
}
