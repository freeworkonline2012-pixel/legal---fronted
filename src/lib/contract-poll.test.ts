import type { ContractResponse } from '@/lib/types';
import { POLL_MAX_CONSECUTIVE_ERRORS, POLL_MAX_MS, PollTimeoutError, describeProgress, isRunning, waitForContract } from './contract-poll';

const c = (status: ContractResponse['status'], extra: Partial<ContractResponse> = {}): ContractResponse => ({
  id: 'c1',
  original_filename: 'a.pdf',
  status,
  extraction_error: null,
  clause_count: null,
  created_at: '2026-11-04T00:00:00Z',
  ...extra,
});

function deps(responses: Array<ContractResponse | Error>, over: Partial<Parameters<typeof waitForContract>[1]> = {}) {
  let t = 0;
  const queue = [...responses];
  const fetchContract = jest.fn(async () => {
    const r = queue.shift();
    if (!r) throw new Error('no more');
    if (r instanceof Error) throw r;
    return r;
  });
  return {
    d: { fetchContract, sleep: jest.fn(async (ms: number) => { t += ms; }), now: () => t, ...over },
    fetchContract,
  };
}

describe('waitForContract', () => {
  it('نتيجة جاهزة من أول ردّ ⇒ لا استعلام ولا انتظار (خادم قديم متزامن)', async () => {
    const { d, fetchContract } = deps([]);
    const r = await waitForContract(c('processed'), d);
    expect(r.status).toBe('processed');
    expect(fetchContract).not.toHaveBeenCalled();
  });

  it('يتابع حتى تنتهى الحالة ويمرّر كل تحديث للعرض', async () => {
    const seen: string[] = [];
    const { d } = deps([
      c('processing', { processing: { stage: 'assessing', label: 'تقييم البنود', done: 2, total: 9 } }),
      c('processed'),
    ], { onUpdate: (x) => seen.push(x.status) });
    const r = await waitForContract(c('processing'), d);
    expect(r.status).toBe('processed');
    expect(seen).toEqual(['processing', 'processing', 'processed']);
  });

  it('الفشل حالة نهائية صالحة (extraction_failed) تُعاد للعرض', async () => {
    const { d } = deps([c('extraction_failed', { extraction_error: 'x' })]);
    expect((await waitForContract(c('processing'), d)).status).toBe('extraction_failed');
  });

  it('خطأ شبكة عابر لا يُسقط المتابعة', async () => {
    const { d } = deps([new Error('net'), new Error('net'), c('processed')]);
    expect((await waitForContract(c('processing'), d)).status).toBe('processed');
  });

  it('أخطاء متتالية كثيرة ⇒ يُرمى الخطأ', async () => {
    const errs = Array.from({ length: POLL_MAX_CONSECUTIVE_ERRORS }, () => new Error('net'));
    const { d } = deps(errs);
    await expect(waitForContract(c('processing'), d)).rejects.toThrow('net');
  });

  it('خطأ نهائى (مثل 401) يُرمى فوراً بلا إعادة', async () => {
    const fatal = Object.assign(new Error('401'), { status: 401 });
    const { d, fetchContract } = deps([fatal, c('processed')], { isFatal: (e) => (e as { status?: number }).status === 401 });
    await expect(waitForContract(c('processing'), d)).rejects.toThrow('401');
    expect(fetchContract).toHaveBeenCalledTimes(1);
  });

  it('سقف زمنى كلى ⇒ PollTimeoutError برسالة مفهومة', async () => {
    const forever = Array.from({ length: 2000 }, () => c('processing'));
    const { d } = deps(forever);
    await expect(waitForContract(c('processing'), d)).rejects.toBeInstanceOf(PollTimeoutError);
    expect(POLL_MAX_MS).toBe(45 * 60_000);
  });

  it('الإلغاء (مغادرة الصفحة) يوقف المتابعة بـAbortError', async () => {
    let cancelled = false;
    const { d } = deps([c('processing')], { isCancelled: () => cancelled, sleep: async () => { cancelled = true; } });
    await expect(waitForContract(c('processing'), d)).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('describeProgress / isRunning', () => {
  it('نص التقدم بنسبته أو بالمرحلة وحدها أو null', () => {
    expect(describeProgress({ stage: 'assessing', label: 'تقييم البنود', done: 4, total: 12 })).toBe('تقييم البنود (4 من 12)');
    expect(describeProgress({ stage: 'segmenting', label: 'تقسيم العقد إلى بنود', done: 0, total: 0 })).toBe('تقسيم العقد إلى بنود');
    expect(describeProgress(null)).toBeNull();
    expect(describeProgress(undefined)).toBeNull();
  });
  it('الحالات الجارية', () => {
    expect(isRunning(c('uploaded'))).toBe(true);
    expect(isRunning(c('processing'))).toBe(true);
    expect(isRunning(c('processed'))).toBe(false);
    expect(isRunning(c('extraction_failed'))).toBe(false);
  });
});
