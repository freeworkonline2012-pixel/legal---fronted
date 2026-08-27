'use client';

/**
 * نموذج السؤال في صفحة الهبوط (S-01) — عند الإرسال ينتقل إلى /chat مع ملء السؤال.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { normalizeArabicDigits } from '@/lib/normalize';
import { PrivacyNote } from '@/components/ui/PrivacyNote';

export function LandingQuestionForm() {
  const router = useRouter();
  const [value, setValue] = useState('');

  const canSubmit = normalizeArabicDigits(value).trim().length >= 3;

  function handleSubmit() {
    const trimmed = normalizeArabicDigits(value).trim();
    if (trimmed.length < 3) return;
    router.push(`/chat?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="landing-question" className="sr-only">
          اكتب سؤالك القانوني هنا
        </label>
        <input
          id="landing-question"
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleSubmit();
          }}
          placeholder="اكتب سؤالك القانوني هنا…"
          className="h-12 flex-1 rounded-md border border-border-default bg-surface px-4 text-body text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--color-focus-ring)]"
        />
        <Button onClick={handleSubmit} disabled={!canSubmit} size="lg" aria-label="اسأل">
          <Send className="h-4 w-4" aria-hidden="true" />
          اسأل
        </Button>
      </div>
      <div className="flex justify-center sm:justify-start">
        <PrivacyNote />
      </div>
    </div>
  );
}
