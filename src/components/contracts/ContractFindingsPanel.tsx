/**
 * لوحة «ملاحظات على العقد ككل» (الجولة 3): ما لا يظهر عند قراءة كل بند وحده — بنود غير مرصودة بحسب نوع العقد، إحالات ومصطلحات غير معرَّفة،
 * شروط مفتوحة، وتعارض محتمل بين بندين. الصياغة احتمالية عمداً («لم يُرصد»، «محتمل») ويأتى كل دليل باقتباس حرفى من نص العقد.
 */
import { ListChecks } from 'lucide-react';
import type { ContractFinding, ContractResponse } from '@/lib/types';

const SEVERITY_STYLE: Record<ContractFinding['severity'], string> = {
  حرج: 'bg-error-soft text-error',
  عالٍ: 'bg-warning-soft text-warning',
  متوسط: 'bg-surface-muted text-text-secondary',
  منخفض: 'bg-surface-muted text-text-tertiary',
};

interface Props {
  findings: ContractFinding[] | undefined;
  model: ContractResponse['contract_findings_model'];
}

export function ContractFindingsPanel({ findings, model }: Props) {
  // عقد قديم لم يُحلَّل أصلاً: لا لوحة
  if (findings === undefined) return null;
  const modelNote =
    model === 'skipped'
      ? 'العقد أطول من الحد المعتمد لفحص التعارض بين البنود آلياً، فلم يُجرَ هذا الفحص؛ تظهر هنا نتائج الفحوص الحتمية فقط.'
      : model === 'error'
        ? 'تعذّر إتمام فحص التعارض بين البنود آلياً؛ تظهر هنا نتائج الفحوص الحتمية فقط.'
        : null;
  return (
    <section aria-label="ملاحظات على العقد ككل" className="rounded-lg border border-border-default bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <ListChecks className="h-5 w-5 text-text-secondary" aria-hidden="true" />
        <h3 className="text-h4 font-semibold text-text-primary">ملاحظات على العقد ككل</h3>
        {findings.length > 0 ? (
          <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-caption text-text-secondary">{findings.length}</span>
        ) : null}
      </div>
      <p className="mt-1 text-body-sm text-text-tertiary">
        علاقات بين البنود لا بند واحد: بنود لم يُرصد لها نص، إحالات غير معرَّفة، شروط مفتوحة، وتعارض محتمل. «لم يُرصد» تعنى أن الأداة لم تجد النص، وقد يكون فى مرفق أو فى جزء لم يُقرأ؛ والقرار لمحامٍ مختص.
      </p>
      {modelNote ? (
        <p role="status" className="mt-2 rounded-md bg-surface-muted px-3 py-2 text-body-sm text-text-secondary">
          {modelNote}
        </p>
      ) : null}
      {findings.length === 0 ? (
        <p className="mt-3 text-body-sm text-text-secondary">لم تُرصد ملاحظات على مستوى العقد ككل بالفحوص المطبَّقة.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {findings.map((f) => (
            <li key={f.id} className="rounded-md border border-border-default">
              <details>
                <summary className="flex min-h-[44px] cursor-pointer flex-wrap items-center gap-2 px-3 py-2 text-body-sm text-text-primary">
                  <span className={`rounded-full px-2.5 py-0.5 text-caption font-semibold ${SEVERITY_STYLE[f.severity] ?? SEVERITY_STYLE['متوسط']}`}>
                    {f.severity}
                  </span>
                  <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-caption text-text-secondary">{f.kind_label}</span>
                  <span className="font-semibold">{f.title}</span>
                </summary>
                <div className="space-y-2 border-t border-border-default px-3 py-3 text-body-sm text-text-secondary">
                  <p>{f.explanation}</p>
                  {f.evidence.length > 0 ? (
                    <ul aria-label="من نص العقد" className="space-y-1.5">
                      {f.evidence.map((e, i) => (
                        <li key={i} className="rounded-md bg-surface-inset p-3">
                          <span className="font-semibold text-text-primary">{e.clause_label}: </span>
                          <q className="legal-text text-text-primary">{e.quote}</q>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {f.suggestion ? (
                    <p>
                      <span className="font-semibold text-text-primary">المعالجة المقترحة: </span>
                      {f.suggestion}
                    </p>
                  ) : null}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
