/**
 * مكوّن ProgressSteps — مؤشر التقدم المرحلي النصي (component_states.md القسم 7).
 *
 * الخطوات الثلاث الثابتة: ١. البحث ← ٢. التحقق ← ٣. التوليد.
 * - pending: رمادي + أيقونة دائرة فارغة.
 * - active: primary + نبض بطيء (1.6s) — يتوقف عند prefers-reduced-motion.
 * - done: success + أيقونة ✓.
 *
 * ممنوع شريط تقدم وهمي متحرك بلا معنى (P4 + Motion rules).
 */

import { Check, Circle } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export type ProgressStepStatus = 'pending' | 'active' | 'done';

export interface ProgressStepItem {
  id: string;
  label: string;
}

export const DEFAULT_PROGRESS_STEPS: ProgressStepItem[] = [
  { id: 'search', label: '١. جارٍ البحث في النصوص القانونية…' },
  { id: 'verify', label: '٢. جارٍ التحقق من المصادر…' },
  { id: 'generate', label: '٣. جارٍ صياغة الإجابة…' },
];

export interface ProgressStepsProps {
  steps?: ProgressStepItem[];
  /** فهرس الخطوة النشطة حالياً (0-based) */
  currentIndex: number;
}

function StepIcon({ status }: { status: ProgressStepStatus }) {
  if (status === 'done') {
    return <Check className="h-4 w-4 text-success" aria-hidden="true" />;
  }
  if (status === 'active') {
    // دوران واحد فقط — كانت النسخة السابقة تطبّق animate-spin و motion-safe:animate-step-pulse
    // معاً على نفس العنصر (حركتان متعارضتان: دوران + نبض) — تُظهر إحداهما فقط. الإيقاف عند
    // prefers-reduced-motion مغطّى بالقاعدة العامة في globals.css (animation-duration: 0.01ms).
    return (
      <Loader2
        className="h-4 w-4 animate-spin text-primary"
        aria-hidden="true"
      />
    );
  }
  return <Circle className="h-4 w-4 text-text-tertiary" aria-hidden="true" />;
}

export function ProgressSteps({ steps = DEFAULT_PROGRESS_STEPS, currentIndex }: ProgressStepsProps) {
  return (
    <ol className="space-y-2" aria-label="مراحل معالجة السؤال">
      {steps.map((step, index) => {
        const status: ProgressStepStatus =
          index < currentIndex ? 'done' : index === currentIndex ? 'active' : 'pending';
        return (
          <li
            key={step.id}
            aria-current={status === 'active' ? 'step' : undefined}
            className={`flex h-8 items-center gap-2 text-body-sm ${
              status === 'pending' ? 'text-text-tertiary' : status === 'active' ? 'text-primary' : 'text-success'
            }`}
          >
            <StepIcon status={status} />
            <span>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
