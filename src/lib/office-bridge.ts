import { ADDIN_MAX_FILE_BYTES, assembleSlices, docxFileName, type PlannedComment } from '@/lib/word-addin';

/**
 * جسر Office.js لإضافة Word. أنواع مصغَّرة لما نستعمله فقط (بلا اعتماد على حزمة @types/office-js).
 * كل شىء هنا يفترض الوجود داخل Word؛ خارجه تفشل الدوال برسالة واضحة ولا تُسقط الصفحة.
 */

const OFFICE_JS_URL = 'https://appsforoffice.microsoft.com/lib/1/hosted/office.js';

interface AsyncResult<T> {
  status: unknown;
  value: T;
  error?: { message?: string };
}
interface OfficeFile {
  size: number;
  sliceCount: number;
  getSliceAsync(index: number, cb: (r: AsyncResult<{ data: ArrayLike<number> }>) => void): void;
  closeAsync(cb?: () => void): void;
}
interface WordRange {
  insertComment(text: string): unknown;
}
interface WordSearchResults {
  items: WordRange[];
  load(props: string): void;
}
interface WordContext {
  document: {
    body: { search(text: string, options?: { matchCase?: boolean }): WordSearchResults; paragraphs: { getFirst(): { getRange(where: string): WordRange } } };
  };
  sync(): Promise<void>;
}
export interface OfficeGlobal {
  onReady(cb?: (info: { host?: unknown }) => void): Promise<{ host?: unknown }>;
  context: {
    document: {
      url?: string | null;
      getFileAsync(type: unknown, options: { sliceSize: number }, cb: (r: AsyncResult<OfficeFile>) => void): void;
    };
    requirements: { isSetSupported(name: string, version?: string): boolean };
  };
  FileType: { Compressed: unknown };
  AsyncResultStatus: { Succeeded: unknown };
  HostType?: { Word?: unknown };
}
interface WordGlobal {
  run<T>(batch: (ctx: WordContext) => Promise<T>): Promise<T>;
}
type OfficeWindow = { Office?: OfficeGlobal; Word?: WordGlobal };

function win(): OfficeWindow {
  return (typeof window === 'undefined' ? {} : window) as unknown as OfficeWindow;
}

/** يحمّل office.js من شبكة Microsoft مرة واحدة (شرط Microsoft: لا نسخة محلية). يعيد null إن لم يتوفر Office. */
export function loadOfficeJs(timeoutMs = 8000): Promise<OfficeGlobal | null> {
  const w = win();
  if (w.Office) return Promise.resolve(w.Office);
  if (typeof document === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = OFFICE_JS_URL;
    script.async = true;
    const timer = setTimeout(() => resolve(win().Office ?? null), timeoutMs);
    script.onload = () => {
      clearTimeout(timer);
      resolve(win().Office ?? null);
    };
    script.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    document.head.appendChild(script);
  });
}

/** هل الصفحة تعمل فعلاً داخل Word؟ (office.js يُحمَّل فى أى متصفح لكن onReady يعيد host فقط داخل تطبيق Office) */
export async function isInsideWord(office: OfficeGlobal): Promise<boolean> {
  try {
    const info = await Promise.race([
      office.onReady(),
      new Promise<null>((r) => setTimeout(() => r(null), 5000)),
    ]);
    if (!info || info.host === undefined || info.host === null) return false;
    const word = office.HostType?.Word;
    return word === undefined || info.host === word;
  } catch {
    return false;
  }
}

/** هل يدعم هذا Word إدراج التعليقات (WordApi 1.4)؟ */
export function supportsComments(office: OfficeGlobal): boolean {
  try {
    return office.context.requirements.isSetSupported('WordApi', '1.4');
  } catch {
    return false;
  }
}

/** يقرأ نسخة من المستند المفتوح (بما فيه تعديلاته غير المحفوظة) على هيئة File docx */
export function readOpenDocument(office: OfficeGlobal, sliceSize = 2 * 1024 * 1024): Promise<File> {
  return new Promise((resolve, reject) => {
    office.context.document.getFileAsync(office.FileType.Compressed, { sliceSize }, (res) => {
      if (res.status !== office.AsyncResultStatus.Succeeded) {
        reject(new Error(res.error?.message ? `تعذّرت قراءة المستند: ${res.error.message}` : 'تعذّرت قراءة المستند المفتوح.'));
        return;
      }
      const file = res.value;
      if (file.size > ADDIN_MAX_FILE_BYTES) {
        file.closeAsync();
        reject(new Error('حجم المستند كبير جداً — الحد الأقصى 10 ميجابايت.'));
        return;
      }
      const slices: ArrayLike<number>[] = [];
      let index = 0;
      const next = () => {
        if (index >= file.sliceCount) {
          file.closeAsync();
          const bytes = assembleSlices(slices);
          resolve(
            new File([bytes as BlobPart], docxFileName(office.context.document.url), {
              type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            }),
          );
          return;
        }
        file.getSliceAsync(index, (r) => {
          if (r.status !== office.AsyncResultStatus.Succeeded) {
            file.closeAsync();
            reject(new Error('تعذّرت قراءة جزء من المستند — أعد المحاولة.'));
            return;
          }
          slices.push(r.value.data);
          index += 1;
          next();
        });
      };
      next();
    });
  });
}

export interface InsertResult {
  inserted: number;
  /** تعليقات وُضعت على بداية المستند لأنها ملاحظة على العقد ككل (لا موضع لها) */
  general: number;
  /** تعليقات لم نجد نصها فى المستند (تُراجَع من التقرير) */
  notFound: number;
}

/**
 * يُدرج التعليقات واحداً واحداً: فشل تعليق لا يُسقط الباقى. لا يُغيّر أى نص: insertComment فقط.
 * البحث حرفى (بلا wildcards)؛ نجرّب مرشّحات الموضع بالترتيب ونأخذ أول نتيجة.
 */
export async function insertComments(planned: ReadonlyArray<PlannedComment>): Promise<InsertResult> {
  const word = win().Word;
  if (!word) throw new Error('Word غير متاح فى هذه الصفحة.');
  const result: InsertResult = { inserted: 0, general: 0, notFound: 0 };
  for (const item of planned) {
    try {
      const outcome = await word.run(async (ctx) => {
        if (item.anchors.length === 0) {
          ctx.document.body.paragraphs.getFirst().getRange('Content').insertComment(item.text);
          await ctx.sync();
          return 'general' as const;
        }
        for (const anchor of item.anchors) {
          const found = ctx.document.body.search(anchor, { matchCase: false });
          found.load('items');
          await ctx.sync();
          if (found.items.length > 0) {
            found.items[0]!.insertComment(item.text);
            await ctx.sync();
            return 'anchored' as const;
          }
        }
        return 'missing' as const;
      });
      if (outcome === 'general') result.general += 1;
      else if (outcome === 'anchored') result.inserted += 1;
      else result.notFound += 1;
    } catch {
      result.notFound += 1;
    }
  }
  return result;
}
