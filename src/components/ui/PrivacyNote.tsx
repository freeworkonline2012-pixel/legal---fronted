/**
 * مكوّن PrivacyNote — نص الخصوصية قرب حقل السؤال (component_states.md القسم 10 + P5).
 *
 * - ثابت لا يُطوى ولا يُخفى (أولوية UX #8).
 * - عند تفعيل «الجلسة الخفية» يُستبدل النص بنص آخر.
 * - أيقونة قفل + نص — لا لون وحده.
 */

import { Eye, Lock } from 'lucide-react';

export interface PrivacyNoteProps {
  /** الجلسة الخفية مفعّلة (شخصية 2 — P1) */
  hiddenSession?: boolean;
}

export function PrivacyNote({ hiddenSession = false }: PrivacyNoteProps) {
  return (
    <p className="flex items-center gap-1.5 text-caption text-text-secondary">
      {hiddenSession ? (
        <>
          <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>جلسة خفية مفعّلة — لن تظهر معاينة سؤالك في الإشعارات.</span>
        </>
      ) : (
        <>
          <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>سؤالك يُعالج بتشفير، ويمكنك حذفه في أي وقت وفق قانون 151/2020.</span>
        </>
      )}
    </p>
  );
}
