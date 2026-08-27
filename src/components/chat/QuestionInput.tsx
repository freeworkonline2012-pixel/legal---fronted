/**
 * مكوّن QuestionInput — حقل سؤال المستخدم (S-02 في wireframes + P5).
 *
 * - TextArea بارز (120px أدنى) + زر «اسأل» معطّل حتى 3 أحرف على الأقل.
 * - شريحة «المجال المحدد» الحية عند الكتابة (F-01 — تقدير أمامي خفيف).
 * - نص الخصوصية قرب الحقل (P5 + 151/2020).
 * - مكوّن مُتحكَّم فيه (value + onValueChange) ليتفاعل مع الأسئلة المقترحة وإعادة الصياغة.
 */

'use client';

import { useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/TextArea';
import { PrivacyNote } from '@/components/ui/PrivacyNote';
import { DomainChip } from '@/components/ui/DomainChip';
import { normalizeArabicDigits, detectDomain } from '@/lib/normalize';

export interface QuestionInputProps {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: (question: string) => void;
  loading?: boolean;
  disabled?: boolean;
}

export function QuestionInput({ value, onValueChange, onSubmit, loading = false, disabled = false }: QuestionInputProps) {
  const [error, setError] = useState<string | null>(null);

  const normalizedLength = useMemo(() => normalizeArabicDigits(value).trim().length, [value]);
  const canSubmit = normalizedLength >= 3 && !loading && !disabled;
  const detectedDomain = useMemo(() => detectDomain(value), [value]);

  function handleSubmit() {
    const trimmed = normalizeArabicDigits(value).trim();
    if (trimmed.length < 3) {
      setError('اكتب سؤالك أولاً — حتى بالعامية');
      return;
    }
    setError(null);
    onSubmit(trimmed);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Ctrl/Cmd + Enter للإرسال (اختصار للمحترفين — شخصية 3)
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="space-y-3">
      <TextArea
        id="question-input"
        label="اسأل عن حقك القانوني"
        value={value}
        onChange={(event) => {
          onValueChange(event.target.value);
          if (error) setError(null);
        }}
        onKeyDown={handleKeyDown}
        placeholder="اكتب سؤالك هنا… (العامية مقبولة)"
        error={error ?? undefined}
        disabled={disabled}
        rows={3}
        maxLength={500}
      />

      {detectedDomain ? (
        <div className="flex items-center gap-2">
          <span className="text-caption text-text-tertiary">المجال المحدد:</span>
          <DomainChip domain={detectedDomain} />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PrivacyNote />
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          loading={loading}
          size="lg"
          aria-label="إرسال السؤال"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          اسأل
        </Button>
      </div>
    </div>
  );
}
