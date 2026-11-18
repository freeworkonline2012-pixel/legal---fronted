import { insertComments, isInsideWord, loadOfficeJs, readOpenDocument, supportsComments, type OfficeGlobal } from './office-bridge';
import type { PlannedComment } from './word-addin';

const OK = 'ok';
function fakeOffice(opts: { slices?: number[][]; size?: number; failSlice?: number; failOpen?: boolean; host?: unknown; url?: string | null } = {}): OfficeGlobal {
  const slices = opts.slices ?? [[1, 2, 3], [4, 5]];
  const closeAsync = jest.fn();
  return {
    onReady: jest.fn().mockResolvedValue({ host: opts.host }),
    FileType: { Compressed: 'compressed' },
    AsyncResultStatus: { Succeeded: OK },
    HostType: { Word: 'Word' },
    context: {
      requirements: { isSetSupported: jest.fn().mockReturnValue(true) },
      document: {
        url: opts.url === undefined ? 'C:\\docs\\عقد.docx' : opts.url,
        getFileAsync: (_t: unknown, _o: unknown, cb: (r: unknown) => void) => {
          if (opts.failOpen) return cb({ status: 'fail', value: undefined as never, error: { message: 'boom' } });
          cb({
            status: OK,
            value: {
              size: opts.size ?? slices.flat().length,
              sliceCount: slices.length,
              closeAsync,
              getSliceAsync: (i: number, c: (r: unknown) => void) =>
                i === opts.failSlice ? c({ status: 'fail', value: undefined as never }) : c({ status: OK, value: { data: slices[i]! } }),
            },
          });
        },
      },
    },
    _close: closeAsync,
  } as unknown as OfficeGlobal;
}

describe('office-bridge', () => {
  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).Office;
    delete (window as unknown as Record<string, unknown>).Word;
    document.head.innerHTML = '';
  });

  it('readOpenDocument: يجمّع الشرائح ويسمّى الملف من رابط المستند ويغلق الملف', async () => {
    const office = fakeOffice();
    const file = await readOpenDocument(office);
    expect(file.name).toBe('عقد.docx');
    expect(file.size).toBe(5);
    const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as ArrayBuffer);
      r.onerror = () => reject(r.error);
      r.readAsArrayBuffer(file);
    });
    expect(Array.from(new Uint8Array(bytes))).toEqual([1, 2, 3, 4, 5]);
    expect((office as unknown as { _close: jest.Mock })._close).toHaveBeenCalled();
  });

  it('readOpenDocument: ملف أكبر من 10MB يُرفض قبل قراءة أى شريحة، وفشل الفتح/الشريحة برسالة عربية', async () => {
    const big = fakeOffice({ size: 11 * 1024 * 1024 });
    await expect(readOpenDocument(big)).rejects.toThrow(/10 ميجابايت/);
    await expect(readOpenDocument(fakeOffice({ failOpen: true }))).rejects.toThrow(/تعذّرت قراءة المستند/);
    const sliceFail = fakeOffice({ failSlice: 1 });
    await expect(readOpenDocument(sliceFail)).rejects.toThrow(/جزء من المستند/);
    expect((sliceFail as unknown as { _close: jest.Mock })._close).toHaveBeenCalled();
  });

  it('isInsideWord: host=Word فقط؛ غياب host (متصفح عادى) أو انتهاء المهلة ⇒ false', async () => {
    expect(await isInsideWord(fakeOffice({ host: 'Word' }))).toBe(true);
    expect(await isInsideWord(fakeOffice({ host: 'Excel' }))).toBe(false);
    expect(await isInsideWord(fakeOffice({ host: null }))).toBe(false);
    const rejecting = fakeOffice();
    (rejecting.onReady as jest.Mock).mockRejectedValue(new Error('x'));
    expect(await isInsideWord(rejecting)).toBe(false);
  });

  it('supportsComments يحترم WordApi 1.4 ولا يرمى', () => {
    const o = fakeOffice();
    expect(supportsComments(o)).toBe(true);
    (o.context.requirements.isSetSupported as jest.Mock).mockReturnValue(false);
    expect(supportsComments(o)).toBe(false);
    (o.context.requirements.isSetSupported as jest.Mock).mockImplementation(() => {
      throw new Error('x');
    });
    expect(supportsComments(o)).toBe(false);
  });

  it('loadOfficeJs: يعيد Office الموجود، ويحمّل السكربت من Microsoft، ويعيد null عند الفشل', async () => {
    (window as unknown as Record<string, unknown>).Office = { x: 1 };
    expect(await loadOfficeJs()).toEqual({ x: 1 });
    delete (window as unknown as Record<string, unknown>).Office;
    const p = loadOfficeJs(500);
    const script = document.head.querySelector('script')!;
    expect(script.src).toBe('https://appsforoffice.microsoft.com/lib/1/hosted/office.js');
    script.dispatchEvent(new Event('error'));
    expect(await p).toBeNull();
  });

  it('insertComments: يبحث بالمرشحات بالترتيب ويدرج على أول نتيجة، تعليق عام للملاحظة بلا موضع، ويعدّ غير الموجود دون إسقاط الباقى', async () => {
    const inserted: string[] = [];
    const general: string[] = [];
    const doc = ['الأجر الشهرى المتفق عليه هو اثنا عشر ألف جنيه'];
    (window as unknown as Record<string, unknown>).Word = {
      run: async (batch: (ctx: unknown) => Promise<unknown>) =>
        batch({
          sync: async () => undefined,
          document: {
            body: {
              paragraphs: { getFirst: () => ({ getRange: () => ({ insertComment: (t: string) => general.push(t) }) }) },
              search: (text: string) => ({
                items: doc.some((d) => d.includes(text)) ? [{ insertComment: (t: string) => inserted.push(t) }] : [],
                load: () => undefined,
              }),
            },
          },
        }),
    };
    const planned: PlannedComment[] = [
      { kind: 'clause', severity: 'بند', anchors: ['نص غير موجود إطلاقاً هنا', 'الأجر الشهرى المتفق عليه'], text: 'c1' },
      { kind: 'finding', severity: 'حرج', anchors: [], text: 'general' },
      { kind: 'clause', severity: 'بند', anchors: ['غير موجود تماماً أبداً'], text: 'c3' },
    ];
    const res = await insertComments(planned);
    expect(res).toEqual({ inserted: 1, general: 1, notFound: 1 });
    expect(inserted).toEqual(['c1']);
    expect(general).toEqual(['general']);
  });

  it('insertComments: استثناء من Word لتعليق واحد لا يُسقط الباقى؛ وبلا Word يرمى برسالة واضحة', async () => {
    await expect(insertComments([])).rejects.toThrow(/Word غير متاح/);
    let n = 0;
    (window as unknown as Record<string, unknown>).Word = {
      run: async () => {
        n += 1;
        if (n === 1) throw new Error('word failed');
        return 'anchored';
      },
    };
    const p: PlannedComment = { kind: 'clause', severity: 'بند', anchors: ['نص ما طويل بما يكفى'], text: 't' };
    expect(await insertComments([p, p])).toEqual({ inserted: 1, general: 0, notFound: 1 });
  });
});
